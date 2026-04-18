import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ReviewDecisionSchema = z.object({
  verdict: z.enum(["NORMAL", "SUSPICIOUS", "STORM"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  recommended: z.enum(["CONTINUE", "THROTTLE", "HALT"]),
});

const GeminiApiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
});

type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

const REVIEW_PROMPT = `You are a senior SOC reviewer for Phish-Slayer.
You are reviewing the output quality of the L3 Threat Hunter
agent to prevent false positive alert storms.
You will receive aggregate hunter statistics, which may contain empty/no-signal results.
Respond ONLY with valid JSON:
{
  'verdict': 'NORMAL' or 'SUSPICIOUS' or 'STORM',
  'confidence': float 0.0 to 1.0,
  'reasoning': 'one sentence max',
  'recommended': 'CONTINUE' or 'THROTTLE' or 'HALT'
}
Rules:
- If aggregate data is empty, missing, or shows 0 escalations, return NORMAL with recommended CONTINUE.
- STORM if more than 10 escalations in 1 hour
- SUSPICIOUS if 5 to 10 escalations in 1 hour
- NORMAL if fewer than 5
- HALT recommended only if confidence > 0.9 AND verdict is STORM
- Respond with raw JSON only. No markdown.`;

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

function isAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
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
  let expectedVerdict: "NORMAL" | "SUSPICIOUS" | "STORM" = "NORMAL";
  if (count > 10) {
    expectedVerdict = "STORM";
  } else if (count >= 5) {
    expectedVerdict = "SUSPICIOUS";
  }

  let recommended = decision.recommended;

  if (expectedVerdict === "NORMAL") {
    recommended = "CONTINUE";
  }

  if (expectedVerdict === "SUSPICIOUS" && recommended === "HALT") {
    recommended = "THROTTLE";
  }

  if (
    expectedVerdict === "STORM" &&
    (decision.confidence <= 0.9 || recommended !== "HALT")
  ) {
    recommended = "THROTTLE";
  }

  return {
    ...decision,
    verdict: expectedVerdict,
    recommended,
  };
}

async function callGemini(
  escalationsLastHour: number,
): Promise<ReviewDecision> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
        systemInstruction: {
          parts: [{ text: REVIEW_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  escalations_last_hour: escalationsLastHour,
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Gemini reviewer request failed (${response.status}): ${details}`,
    );
  }

  const payload = await response.json();
  const parsed = GeminiApiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Gemini reviewer response shape invalid");
  }

  const text =
    parsed.data.candidates?.[0]?.content.parts
      .map((part) => part.text || "")
      .join("")
      .trim() || "";

  const cleaned = stripCodeFence(text);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini reviewer response was not valid JSON");
  }

  const decision = ReviewDecisionSchema.safeParse(json);
  if (!decision.success) {
    throw new Error("Gemini reviewer decision schema validation failed");
  }

  return decision.data;
}

function mapSeverity(verdict: "NORMAL" | "SUSPICIOUS" | "STORM") {
  if (verdict === "STORM") return "critical";
  if (verdict === "SUSPICIOUS") return "high";
  return "low";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminClient = getAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const baseUrl = request.nextUrl.origin;
  const cycleId = getCycleId(request);

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

  let decision: ReviewDecision;
  try {
    const rawDecision = await callGemini(escalationsLastHour);
    decision = normalizeDecision(escalationsLastHour, rawDecision);
  } catch (error) {
    decision = normalizeDecision(escalationsLastHour, {
      verdict: "NORMAL",
      confidence: 0,
      reasoning: "Reviewer fallback due to model failure.",
      recommended: "CONTINUE",
    });
    await adminClient.from("audit_logs").insert({
      action: "L3_STAGE_FAILURE",
      severity: "medium",
      metadata: {
        stage: "review",
        failure_type: "gemini_failure",
        cycle_id: cycleId,
        escalations_last_hour: escalationsLastHour,
        error: error instanceof Error ? error.message : "unknown_gemini_error",
      },
      created_at: new Date().toISOString(),
    });
    console.error("[L3 reviewer] Falling back due to model failure", error);
  }

  let actionTaken = "NONE";

  if (decision.verdict === "SUSPICIOUS") {
    await fetch(`${baseUrl}/api/actions/escalate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AGENT_SECRET: process.env.AGENT_SECRET || "",
      },
      body: JSON.stringify({
        alertId: `L3-REVIEW-${Date.now()}`,
        severity: "high",
        title: "L3 Reviewer: High Escalation Volume Warning",
        description: decision.reasoning,
        recommendedAction: "MANUAL_REVIEW",
        telemetrySnapshot: {
          escalations_last_hour: escalationsLastHour,
          decision,
        },
      }),
    });
    actionTaken = "WARNED_HUMAN";
  } else if (decision.verdict === "STORM" && decision.recommended === "HALT") {
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
        description: decision.reasoning,
        recommendedAction: "MANUAL_REVIEW",
        telemetrySnapshot: {
          escalations_last_hour: escalationsLastHour,
          decision,
        },
      }),
    });

    await adminClient.from("agent_circuit_breakers").insert({
      agent: "l3_hunter",
      status: "halted",
      reason: decision.reasoning,
      halted_at: new Date().toISOString(),
    });

    await adminClient.from("audit_logs").insert({
      action: "L3_CIRCUIT_BREAKER_HALTED",
      severity: "critical",
      metadata: {
        cycle_id: cycleId,
        halt_reason: decision.reasoning,
        verdict: decision.verdict,
        confidence: decision.confidence,
        escalations_last_hour: escalationsLastHour,
      },
      created_at: new Date().toISOString(),
    });

    await adminClient.from("hunt_findings").insert({
      hunt_type: "escalation_burst",
      severity: "critical",
      confidence: decision.confidence,
      title: "L3 Review Circuit Breaker Halt",
      description: decision.reasoning,
      indicators: {
        cycle_id: cycleId,
        halt_reason: decision.reasoning,
        escalations_last_hour: escalationsLastHour,
      },
      source_records: [],
      escalated: false,
      escalation_id: null,
      created_by: "l3_agent",
      created_at: new Date().toISOString(),
    });

    actionTaken = "HALT";
  } else if (decision.verdict === "STORM") {
    await fetch(`${baseUrl}/api/actions/escalate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AGENT_SECRET: process.env.AGENT_SECRET || "",
      },
      body: JSON.stringify({
        alertId: `L3-REVIEW-${Date.now()}`,
        severity: "high",
        title: "L3 Reviewer: High Escalation Volume Warning",
        description: decision.reasoning,
        recommendedAction: "MANUAL_REVIEW",
        telemetrySnapshot: {
          escalations_last_hour: escalationsLastHour,
          decision,
        },
      }),
    });
    actionTaken = "THROTTLE";
  }

  await adminClient.from("audit_logs").insert({
    action: "L3_REVIEW_COMPLETE",
    severity: mapSeverity(decision.verdict),
    metadata: {
      cycle_id: cycleId,
      verdict: decision.verdict,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      escalations_last_hour: escalationsLastHour,
      recommended: decision.recommended,
      action_taken: actionTaken,
    },
  });

  return NextResponse.json({
    success: true,
    verdict: decision.verdict,
    confidence: decision.confidence,
    recommended: decision.recommended,
    escalations_reviewed: escalationsLastHour,
    action_taken: actionTaken,
    reasoning: decision.reasoning,
  });
}
