import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildL2ReasoningPrompt,
  saveReasoningChain,
} from "@/lib/reasoning-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GeminiDecisionSchema = z.object({
  execute: z.boolean(),
  action: z.enum(["ISOLATE_IDENTITY", "BLOCK_IP", "MANUAL_REVIEW"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
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

type EscalationRow = {
  id: string;
  alert_id: string | null;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affected_user_id: string | null;
  affected_ip: string | null;
  recommended_action: string | null;
  telemetry_snapshot: unknown;
  discord_notified: boolean | null;
  status: string;
  created_at: string;
};

type RawEscalationRow = Record<string, unknown>;

type Decision = z.infer<typeof GeminiDecisionSchema>;

const L2_PROMPT = `You are an autonomous Tier 2 SOC responder for Phish-Slayer.
A human analyst was notified but has not acted within 15 minutes.
You must now decide whether to execute an automated response.
You will receive an escalation JSON payload.
Respond ONLY with a valid JSON object in this exact format:
{
  'execute': true or false,
  'action': 'ISOLATE_IDENTITY' or 'BLOCK_IP' or 'MANUAL_REVIEW',
  'confidence': float between 0.0 and 1.0,
  'reasoning': 'one sentence max'
}
Rules:
- Only set execute: true if confidence >= 0.85
- ISOLATE_IDENTITY if affected_user_id exists and
  severity is critical or high
- BLOCK_IP if affected_ip exists and severity is
  critical or high
- MANUAL_REVIEW if confidence < 0.85 or severity
  is low or medium
- If uncertain, always set execute: false
- Respond with raw JSON only. No markdown.`;

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
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

function normalizeDecision(raw: Decision, escalation: EscalationRow): Decision {
  const isHighSeverity = ["critical", "high"].includes(escalation.severity);
  if (raw.confidence < 0.85 || !isHighSeverity) {
    return {
      execute: false,
      action: "MANUAL_REVIEW",
      confidence: raw.confidence,
      reasoning: raw.reasoning,
    };
  }

  if (raw.action === "ISOLATE_IDENTITY" && !escalation.affected_user_id) {
    return {
      execute: false,
      action: "MANUAL_REVIEW",
      confidence: raw.confidence,
      reasoning: "Missing affected_user_id required for isolate action.",
    };
  }

  if (raw.action === "BLOCK_IP" && !escalation.affected_ip) {
    return {
      execute: false,
      action: "MANUAL_REVIEW",
      confidence: raw.confidence,
      reasoning: "Missing affected_ip required for block action.",
    };
  }

  if (!raw.execute) {
    return {
      execute: false,
      action: "MANUAL_REVIEW",
      confidence: raw.confidence,
      reasoning: raw.reasoning,
    };
  }

  return raw;
}

function toEscalationRow(row: RawEscalationRow): EscalationRow | null {
  const id = typeof row.id === "string" ? row.id : null;
  const severity = typeof row.severity === "string" ? row.severity : null;

  if (
    !id ||
    !severity ||
    !["low", "medium", "high", "critical"].includes(severity)
  ) {
    return null;
  }

  const affectedUserId =
    typeof row.affected_user_id === "string"
      ? row.affected_user_id
      : typeof row.affectedUserId === "string"
        ? row.affectedUserId
        : null;

  const affectedIp =
    typeof row.affected_ip === "string"
      ? row.affected_ip
      : typeof row.affectedIp === "string"
        ? row.affectedIp
        : typeof row.source_ip === "string"
          ? row.source_ip
          : null;

  return {
    id,
    alert_id:
      typeof row.alert_id === "string"
        ? row.alert_id
        : typeof row.alertId === "string"
          ? row.alertId
          : null,
    severity: severity as EscalationRow["severity"],
    title: typeof row.title === "string" ? row.title : "Untitled escalation",
    description:
      typeof row.description === "string" ? row.description : "No description",
    affected_user_id: affectedUserId,
    affected_ip: affectedIp,
    recommended_action:
      typeof row.recommended_action === "string"
        ? row.recommended_action
        : typeof row.recommendedAction === "string"
          ? row.recommendedAction
          : null,
    telemetry_snapshot: row.telemetry_snapshot ?? row.telemetrySnapshot ?? null,
    discord_notified:
      typeof row.discord_notified === "boolean"
        ? row.discord_notified
        : typeof row.discordNotified === "boolean"
          ? row.discordNotified
          : null,
    status: typeof row.status === "string" ? row.status : "pending",
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
  };
}

async function getDecision(escalation: EscalationRow): Promise<Decision> {
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
        systemInstruction: {
          parts: [{ text: L2_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: JSON.stringify(escalation) }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini failed (${response.status}): ${details}`);
  }

  const body = await response.json();
  const parsedGemini = GeminiApiResponseSchema.safeParse(body);
  if (!parsedGemini.success) {
    throw new Error("Gemini response schema invalid");
  }

  const text =
    parsedGemini.data.candidates?.[0]?.content.parts
      .map((part) => part.text || "")
      .join("")
      .trim() || "";

  const cleaned = stripCodeFence(text);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned non-JSON response");
  }

  const parsedDecision = GeminiDecisionSchema.safeParse(parsedJson);
  if (!parsedDecision.success) {
    throw new Error("Gemini decision failed validation");
  }

  return normalizeDecision(parsedDecision.data, escalation);
}

function isAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

async function callInternalAction(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      AGENT_SECRET: process.env.AGENT_SECRET || "",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Internal action ${path} failed (${response.status}): ${details}`,
    );
  }

  return response;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminClient = getAdminClient();
  const baseUrl = process.env.INTERNAL_API_URL ?? "";

  const { data, error } = await adminClient
    .from("escalations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to query escalations: ${error.message}`,
      },
      { status: 500 },
    );
  }

  const escalations = ((data || []) as RawEscalationRow[])
    .map(toEscalationRow)
    .filter((row): row is EscalationRow => row !== null);
  let processed = 0;
  let autoResolved = 0;
  let manualReview = 0;
  let errors = 0;

  const results: Array<{
    escalation_id: string;
    execute: boolean;
    action: "ISOLATE_IDENTITY" | "BLOCK_IP" | "MANUAL_REVIEW";
    confidence: number;
    reasoning: string;
  }> = [];

  for (const escalation of escalations) {
    try {
      const decisionStartedAt = Date.now();
      const decision = await getDecision(escalation);
      const executionTimeMs = Date.now() - decisionStartedAt;

      const actionsTaken: string[] = [];

      if (decision.execute && decision.action === "ISOLATE_IDENTITY") {
        await callInternalAction(baseUrl, "/api/actions/isolate-identity", {
          targetUserId: escalation.affected_user_id,
          reason: `L2 Auto-Response: ${escalation.description}`,
        });
        actionsTaken.push("ISOLATE_IDENTITY");

        // MCP SCHEMA CHECK: verify table 'escalations' has columns:
        // [status, resolved_by, resolved_at]
        // Run in Supabase SQL Editor before deploying:
        // SELECT column_name FROM information_schema.columns
        // WHERE table_name = 'escalations';
        const { error: updateError } = await adminClient
          .from("escalations")
          .update({
            status: "auto_resolved",
            resolved_by: "l2_agent",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", escalation.id);

        if (updateError) {
          throw new Error(
            `Failed to update escalation status: ${updateError.message}`,
          );
        }

        autoResolved += 1;
      } else if (decision.execute && decision.action === "BLOCK_IP") {
        await callInternalAction(baseUrl, "/api/actions/block-ip", {
          ip: escalation.affected_ip,
          reason: `L2 Auto-Response: ${escalation.description}`,
          threatLevel: escalation.severity,
        });
        actionsTaken.push("BLOCK_IP");

        // MCP SCHEMA CHECK: verify table 'escalations' has columns:
        // [status, resolved_by, resolved_at]
        // Run in Supabase SQL Editor before deploying:
        // SELECT column_name FROM information_schema.columns
        // WHERE table_name = 'escalations';
        const { error: updateError } = await adminClient
          .from("escalations")
          .update({
            status: "auto_resolved",
            resolved_by: "l2_agent",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", escalation.id);

        if (updateError) {
          throw new Error(
            `Failed to update escalation status: ${updateError.message}`,
          );
        }

        autoResolved += 1;
      } else {
        // MCP SCHEMA CHECK: verify table 'escalations' has columns:
        // [status, resolved_by, resolved_at]
        // Run in Supabase SQL Editor before deploying:
        // SELECT column_name FROM information_schema.columns
        // WHERE table_name = 'escalations';
        const { error: updateError } = await adminClient
          .from("escalations")
          .update({
            status: "awaiting_human",
            resolved_by: null,
            resolved_at: null,
          })
          .eq("id", escalation.id);

        if (updateError) {
          throw new Error(
            `Failed to mark escalation awaiting_human: ${updateError.message}`,
          );
        }

        await callInternalAction(baseUrl, "/api/actions/escalate", {
          alertId: escalation.alert_id || escalation.id,
          severity: escalation.severity,
          title: `⚠️ L2 UNRESOLVED - HUMAN REQUIRED: ${escalation.title}`,
          description: escalation.description,
          affectedUserId: escalation.affected_user_id || undefined,
          affectedIp: escalation.affected_ip || undefined,
          recommendedAction: "MANUAL_REVIEW",
          telemetrySnapshot: {
            source_escalation_id: escalation.id,
            l2_decision: decision,
            original_telemetry_snapshot: escalation.telemetry_snapshot,
          },
        });
        actionsTaken.push("ESCALATE_TO_HUMAN");

        manualReview += 1;
      }

      await saveReasoningChain({
        escalation_id: escalation.id,
        agent_level: "L2",
        decision:
          actionsTaken[0] === "ESCALATE_TO_HUMAN"
            ? "ESCALATE_TO_HUMAN"
            : decision.action,
        confidence_score: decision.confidence,
        reasoning_text: decision.reasoning,
        iocs_considered: [
          {
            severity: escalation.severity,
            affected_user_id: escalation.affected_user_id,
            affected_ip: escalation.affected_ip,
            prompt_context: buildL2ReasoningPrompt({
              alert_rule: escalation.title,
              severity: escalation.severity,
              source_ip: escalation.affected_ip,
              l1_confidence: null,
              l1_reasoning: escalation.description,
            }),
          },
        ],
        actions_taken: actionsTaken,
        model_used: "gemini-2.5-flash",
        execution_time_ms: executionTimeMs,
      });

      // MCP SCHEMA CHECK: verify table 'audit_logs' has columns:
      // [action, severity, metadata]
      // Run in Supabase SQL Editor before deploying:
      // SELECT column_name FROM information_schema.columns
      // WHERE table_name = 'audit_logs';
      await adminClient.from("audit_logs").insert({
        action: decision.execute
          ? "L2_AUTO_RESOLVED"
          : "L2_MANUAL_REVIEW_REQUIRED",
        severity: escalation.severity,
        metadata: {
          escalation_id: escalation.id,
          action_taken: decision.action,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          execute: decision.execute,
        },
      });

      processed += 1;
      results.push({
        escalation_id: escalation.id,
        execute: decision.execute,
        action: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      });
    } catch (batchError) {
      errors += 1;
      console.error("[L2 responder] escalation processing failed", {
        escalation_id: escalation.id,
        error: batchError,
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    auto_resolved: autoResolved,
    manual_review: manualReview,
    errors,
    results,
  });
}
