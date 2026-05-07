import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { groqComplete } from "@/lib/ai/groq";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ReviewDecisionSchema = z.object({
  verdict: z.enum(["PROCEED", "HALT", "REDUCE_SCOPE"]),
  confidence: z.number().min(0).max(1),
  halt_reason: z.string().optional(),
  quality_issues: z.array(z.string()),
  approved_findings: z.array(z.number().int().nonnegative()),
  rejected_findings: z.array(z.string()),
  reviewer_notes: z.string().min(1),
});

type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

const REVIEW_PROMPT = `You are a senior threat intelligence reviewer. Your job is
to quality-check L3 hunt findings before they trigger actions.

Review the hunt findings and return ONLY valid JSON:
{
  "verdict": "PROCEED" | "HALT" | "REDUCE_SCOPE",
  "confidence": 0.0-1.0,
  "halt_reason": "only if HALT — specific reason",
  "quality_issues": ["list of finding quality problems"],
  "approved_findings": ["finding indices that are solid"],
  "rejected_findings": ["finding indices with reasons"],
  "reviewer_notes": "what analyst should verify manually"
}

HALT conditions (be strict):
- Hunt findings appear to be based on assumed correlations
  without direct IOC evidence
- Confidence scores are inflated without supporting data
- Findings would trigger actions on internal infrastructure
- Pattern looks like a false positive cascade`;

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getCycleId(request: NextRequest): string | null {
  const value = request.headers.get("x-l3-cycle-id");
  return value && value.trim().length > 0 ? value.trim() : null;
}

function getOrganizationId(request: NextRequest): string | null {
  const value = request.nextUrl.searchParams.get("organization_id");
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = z.string().uuid().safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeDecision(
  count: number,
  decision: ReviewDecision,
): ReviewDecision {
  if (decision.verdict === "HALT" && !decision.halt_reason) {
    return {
      ...decision,
      halt_reason:
        "HALT requested without explicit reason; requires manual analyst validation.",
    };
  }

  if (count > 10 && decision.verdict === "PROCEED") {
    return {
      ...decision,
      verdict: "REDUCE_SCOPE",
    };
  }

  return decision;
}

async function callGemini(
  escalationsLastHour: number,
  recentFindings: Array<Record<string, unknown>>,
): Promise<ReviewDecision> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const text = await groqComplete(
    REVIEW_PROMPT,
    JSON.stringify({
      escalations_last_hour: escalationsLastHour,
      recent_hunt_findings: recentFindings,
      timestamp: new Date().toISOString(),
    }),
  );

  const cleaned = stripCodeFence(text);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("Groq reviewer response was not valid JSON");
  }

  const decision = ReviewDecisionSchema.safeParse(json);
  if (!decision.success) {
    throw new Error("Groq reviewer decision schema validation failed");
  }

  return decision.data;
}

function mapSeverity(verdict: "PROCEED" | "HALT" | "REDUCE_SCOPE") {
  if (verdict === "HALT") return "critical";
  if (verdict === "REDUCE_SCOPE") return "high";
  return "low";
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  const isCronAuthorized =
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (!userId && !isCronAuthorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminClient = getAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const baseUrl = request.nextUrl.origin;
  const cycleId = getCycleId(request);
  const organizationId = getOrganizationId(request);

  const { count, error: countError } = await adminClient
    .from("escalations")
    .select("id", { count: "exact", head: true })
    .like("alert_id", "L3-HUNT-%")
    .gte("created_at", oneHourAgo);

  if (countError) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to count L3 escalations: ${countError.message}`,
      },
      { status: 500 },
    );
  }

  const escalationsLastHour = count || 0;

  let findingsQuery = adminClient
    .from("hunt_findings")
    .select(
      "id, severity, confidence, title, description, indicators, source_records",
    )
    .order("created_at", { ascending: false });
    
  if (organizationId) {
    findingsQuery = findingsQuery.eq("organization_id", organizationId);
  }

  const { data: findingsRows } = await findingsQuery.limit(25);

  const recentFindings = (
    (findingsRows || []) as Array<Record<string, unknown>>
  ).map((row) => ({
    id: row.id,
    severity: row.severity,
    confidence: row.confidence,
    title: row.title,
    description: row.description,
    indicators: row.indicators,
    source_records: row.source_records,
  }));

  let decision: ReviewDecision;
  try {
    const rawDecision = await callGemini(escalationsLastHour, recentFindings);
    decision = normalizeDecision(escalationsLastHour, rawDecision);
  } catch (error) {
    decision = normalizeDecision(escalationsLastHour, {
      verdict: "PROCEED",
      confidence: 0,
      halt_reason: undefined,
      quality_issues: ["Reviewer fallback due to model failure."],
      approved_findings: [],
      rejected_findings: [],
      reviewer_notes: "Model unavailable; manual verification required.",
    });
    await adminClient.from("audit_logs").insert({
      action: "L3_STAGE_FAILURE",
      severity: "medium",
      organization_id: organizationId,
      metadata: {
        stage: "review",
        failure_type: "gemini_failure",
        cycle_id: cycleId,
        organization_id: organizationId,
        escalations_last_hour: escalationsLastHour,
        error: "INTERNAL_SERVER_ERROR",
      },
      created_at: new Date().toISOString(),
    });
    console.error("[L3 reviewer] Falling back due to model failure", error);
  }

  let actionTaken = "NONE";

  if (decision.verdict === "REDUCE_SCOPE") {
    await fetch(`${baseUrl}/api/actions/escalate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AGENT_SECRET: process.env.AGENT_SECRET || "",
      },
      body: JSON.stringify({
        alertId: `L3-REVIEW-${Date.now()}`,
        severity: "high",
        title: "L3 Reviewer: Scope Reduction Recommended",
        description: decision.reviewer_notes,
        organization_id: organizationId,
        recommendedAction: "MANUAL_REVIEW",
        telemetrySnapshot: {
          organization_id: organizationId,
          escalations_last_hour: escalationsLastHour,
          decision,
        },
      }),
    });
    actionTaken = "THROTTLE";
  } else if (decision.verdict === "HALT") {
    await fetch(`${baseUrl}/api/actions/escalate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AGENT_SECRET: process.env.AGENT_SECRET || "",
      },
      body: JSON.stringify({
        alertId: `L3-REVIEW-${Date.now()}`,
        severity: "critical",
        title: "🚨 L3 Reviewer: ALERT STORM DETECTED - Hunter Halted",
        description:
          decision.halt_reason ||
          "Reviewer halted hunt pipeline due to quality concerns.",
        organization_id: organizationId,
        recommendedAction: "MANUAL_REVIEW",
        telemetrySnapshot: {
          organization_id: organizationId,
          escalations_last_hour: escalationsLastHour,
          decision,
        },
      }),
    });

    await adminClient.from("agent_circuit_breakers").insert({
      agent: "l3_hunter",
      status: "halted",
      reason:
        decision.halt_reason ||
        "Reviewer halted hunt pipeline due to quality concerns.",
      halted_at: new Date().toISOString(),
    });

    await adminClient.from("audit_logs").insert({
      action: "L3_CIRCUIT_BREAKER_HALTED",
      severity: "critical",
      organization_id: organizationId,
      metadata: {
        cycle_id: cycleId,
        organization_id: organizationId,
        halt_reason: decision.halt_reason || null,
        verdict: decision.verdict,
        confidence: decision.confidence,
        escalations_last_hour: escalationsLastHour,
        quality_issues: decision.quality_issues,
      },
      created_at: new Date().toISOString(),
    });

    await adminClient.from("hunt_findings").insert({
      hunt_type: "escalation_burst",
      severity: "critical",
      confidence: decision.confidence,
      title: "L3 Review Circuit Breaker Halt",
      description:
        decision.halt_reason ||
        "Reviewer halted hunt pipeline due to quality concerns.",
      indicators: {
        cycle_id: cycleId,
        halt_reason: decision.halt_reason || null,
        escalations_last_hour: escalationsLastHour,
        quality_issues: decision.quality_issues,
      },
      source_records: [],
      escalated: false,
      escalation_id: null,
      created_by: "l3_agent",
      created_at: new Date().toISOString(),
    });

    actionTaken = "HALT";
  }

  await adminClient.from("audit_logs").insert({
    action: "L3_REVIEW_COMPLETE",
    severity: mapSeverity(decision.verdict),
    organization_id: organizationId,
    metadata: {
      cycle_id: cycleId,
      organization_id: organizationId,
      verdict: decision.verdict,
      confidence: decision.confidence,
      halt_reason: decision.halt_reason || null,
      quality_issues: decision.quality_issues,
      reviewer_notes: decision.reviewer_notes,
      escalations_last_hour: escalationsLastHour,
      approved_findings: decision.approved_findings,
      rejected_findings: decision.rejected_findings,
      action_taken: actionTaken,
    },
  });

  return NextResponse.json({
    success: true,
    verdict: decision.verdict,
    confidence: decision.confidence,
    halt_reason: decision.halt_reason || null,
    quality_issues: decision.quality_issues,
    reviewer_notes: decision.reviewer_notes,
    escalations_reviewed: escalationsLastHour,
    action_taken: actionTaken,
  });
}
