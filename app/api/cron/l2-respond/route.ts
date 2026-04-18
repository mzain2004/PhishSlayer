import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildL2ReasoningPrompt,
  saveReasoningChain,
} from "@/lib/reasoning-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROCESSING_WINDOW_MS = 5 * 60 * 1000;
const SWEEP_ESCALATION_MIN_AGE_MINUTES = 5;

const GeminiDecisionSchema = z.object({
  decision: z.enum(["BLOCK_IP", "ISOLATE_IDENTITY", "MANUAL_REVIEW"]),
  execute: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  risk_assessment: z.string().min(1),
  reversibility: z.string().min(1),
  escalation_notes: z.string().min(1),
  iocs_confirmed: z.array(z.string()),
  action_scope: z.string().min(1),
});

const TenantIdSchema = z.string().uuid();

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

type ProcessResult = {
  escalation_id: string;
  execute: boolean;
  action: "ISOLATE_IDENTITY" | "BLOCK_IP" | "MANUAL_REVIEW";
  confidence: number;
  reasoning: string;
  outcome: "completed" | "failed";
  status: string;
  duration_ms?: number;
};

const L2_PROMPT = `You are a senior SOC responder with authority to take
automated containment actions. You must be precise —
wrong actions cause business disruption.

You will receive:
- The original L1 triage decision and reasoning
- The full escalation record
- Alert severity and confidence scores
- Available actions: BLOCK_IP, ISOLATE_IDENTITY, MANUAL_REVIEW

Return ONLY valid JSON:
{
  "decision": "BLOCK_IP" | "ISOLATE_IDENTITY" | "MANUAL_REVIEW",
  "execute": true | false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed justification referencing L1
    findings and why this specific action is appropriate",
  "risk_assessment": "potential business impact of this action",
  "reversibility": "how to undo this action if wrong",
  "escalation_notes": "what human analyst needs to know",
  "iocs_confirmed": ["confirmed indicators of compromise"],
  "action_scope": "exactly what will be blocked/isolated"
}

Rules:
- BLOCK_IP only for confirmed malicious external IPs with
  confidence >= 0.85
- ISOLATE_IDENTITY only for confirmed compromised accounts
  with confidence >= 0.85
- MANUAL_REVIEW if confidence < 0.85 or action is irreversible
- Never execute on internal IP ranges (10.x, 192.168.x, 172.16-31.x)
- Always set execute: false if business-critical systems involved`;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 30_000;

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

type GeminiPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiGenerateContentResponse = { candidates?: GeminiCandidate[] };

async function generateGeminiText(payload: unknown): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gemini failed (${response.status}): ${details}`);
    }

    const body = (await response.json()) as GeminiGenerateContentResponse;
    const text =
      body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

function fallbackDecision(reasoning = "gemini_unavailable"): Decision {
  return {
    decision: "MANUAL_REVIEW",
    execute: false,
    confidence: 0,
    reasoning,
    risk_assessment: "Unable to assess due to model failure.",
    reversibility: "No automated action taken.",
    escalation_notes: "Fallback path used; route to human analyst.",
    iocs_confirmed: [],
    action_scope: "none",
  };
}

function isInternalIp(ip: string | null): boolean {
  if (!ip) {
    return false;
  }

  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function isBusinessCriticalContext(escalation: EscalationRow): boolean {
  const haystack =
    `${escalation.title} ${escalation.description}`.toLowerCase();
  return /(business[-\s]?critical|domain controller|production|pci|payment|identity provider)/.test(
    haystack,
  );
}

function normalizeDecision(raw: Decision, escalation: EscalationRow): Decision {
  const isHighSeverity = ["critical", "high"].includes(escalation.severity);

  if (raw.confidence < 0.85 || !isHighSeverity) {
    return {
      ...raw,
      decision: "MANUAL_REVIEW",
      execute: false,
    };
  }

  if (raw.decision === "MANUAL_REVIEW") {
    return {
      ...raw,
      execute: false,
    };
  }

  if (raw.decision === "ISOLATE_IDENTITY" && !escalation.affected_user_id) {
    return {
      ...raw,
      decision: "MANUAL_REVIEW",
      execute: false,
      reasoning: "Missing affected_user_id required for isolate action.",
    };
  }

  if (raw.decision === "BLOCK_IP" && !escalation.affected_ip) {
    return {
      ...raw,
      decision: "MANUAL_REVIEW",
      execute: false,
      reasoning: "Missing affected_ip required for block action.",
    };
  }

  if (raw.decision === "BLOCK_IP" && isInternalIp(escalation.affected_ip)) {
    return {
      ...raw,
      decision: "MANUAL_REVIEW",
      execute: false,
      reasoning: "Internal IP detected; blocking is prohibited by policy.",
    };
  }

  if (isBusinessCriticalContext(escalation)) {
    return {
      ...raw,
      decision: "MANUAL_REVIEW",
      execute: false,
      reasoning: "Business-critical context detected; forcing manual review.",
    };
  }

  if (!raw.execute) {
    return {
      ...raw,
      decision: "MANUAL_REVIEW",
      execute: false,
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
  try {
    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: L2_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(escalation) }],
        },
      ],
    };

    const text = await generateGeminiText(geminiPayload);
    const cleaned = stripCodeFence(text);

    const parsedJson = JSON.parse(cleaned);
    const parsedDecision = GeminiDecisionSchema.safeParse(parsedJson);
    if (!parsedDecision.success) {
      return fallbackDecision();
    }

    return normalizeDecision(parsedDecision.data, escalation);
  } catch (error) {
    console.error("[L2 responder] Gemini decision failed; using fallback", {
      escalation_id: escalation.id,
      error,
    });
    return fallbackDecision();
  }
}

function isCronAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

function isInternalAgentAuthorized(request: NextRequest): boolean {
  const providedSecret =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");

  return Boolean(providedSecret && providedSecret === process.env.AGENT_SECRET);
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

function triggerSigmaRuleGeneration(baseUrl: string, alertId: string | null) {
  if (!alertId) {
    return;
  }

  void fetch(`${baseUrl}/api/detection/sigma`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ alert_id: alertId }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const details = await response.text();
        console.error("[L2 responder] Sigma generation trigger failed", {
          alert_id: alertId,
          status: response.status,
          details,
        });
      }
    })
    .catch((error) => {
      console.error("[L2 responder] Sigma generation trigger error", {
        alert_id: alertId,
        error,
      });
    });
}

type LifecycleStage =
  | "received"
  | "decision"
  | "action_taken"
  | "outcome"
  | "skipped";

function stageToAction(stage: LifecycleStage): string {
  if (stage === "received") return "L2_ESCALATION_RECEIVED";
  if (stage === "decision") return "L2_ESCALATION_DECISION";
  if (stage === "action_taken") return "L2_ESCALATION_ACTION_TAKEN";
  if (stage === "outcome") return "L2_ESCALATION_OUTCOME";
  return "L2_ESCALATION_SKIPPED";
}

function inferAlertSource(escalation: EscalationRow): string {
  const telemetry = escalation.telemetry_snapshot;
  if (telemetry && typeof telemetry === "object") {
    const source = (telemetry as { source?: unknown }).source;
    if (typeof source === "string" && source.trim().length > 0) {
      return source;
    }

    const nested = (telemetry as { original_telemetry_snapshot?: unknown })
      .original_telemetry_snapshot;
    if (nested && typeof nested === "object") {
      const nestedSource = (nested as { source?: unknown }).source;
      if (typeof nestedSource === "string" && nestedSource.trim().length > 0) {
        return nestedSource;
      }
    }
  }

  return escalation.alert_id ? "wazuh" : "unknown";
}

async function writeLifecycleAudit(
  adminClient: ReturnType<typeof getAdminClient>,
  stage: LifecycleStage,
  escalation: EscalationRow,
  metadata: Record<string, unknown> = {},
  tenantId: string | null = null,
) {
  const payload = {
    tenant_id: tenantId,
    escalation_id: escalation.id,
    alert_id: escalation.alert_id,
    stage,
    ...metadata,
  };

  const { error } = await adminClient.from("audit_logs").insert({
    action: stageToAction(stage),
    severity: escalation.severity,
    metadata: payload,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[L2 responder] failed to write lifecycle audit", {
      escalation_id: escalation.id,
      stage,
      error,
    });
  }
}

function readTenantIdFromUnknown(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = TenantIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function resolveEscalationTenantId(
  escalation: EscalationRow,
  l1Result: Record<string, unknown> | null | undefined,
): string | null {
  const telemetry = escalation.telemetry_snapshot;

  if (telemetry && typeof telemetry === "object") {
    const telemetryTenantId = readTenantIdFromUnknown(
      (telemetry as Record<string, unknown>).tenant_id,
    );

    if (telemetryTenantId) {
      return telemetryTenantId;
    }
  }

  const l1TenantId = readTenantIdFromUnknown(l1Result?.tenant_id);
  return l1TenantId;
}

async function claimEscalation(
  adminClient: ReturnType<typeof getAdminClient>,
  escalation: EscalationRow,
): Promise<
  "claimed" | "already_processing" | "recently_processed" | "lost_race"
> {
  const { data: latest, error: latestError } = await adminClient
    .from("escalations")
    .select("status, resolved_at")
    .eq("id", escalation.id)
    .single();

  if (latestError || !latest) {
    return "lost_race";
  }

  const latestStatus =
    typeof latest.status === "string" ? latest.status.toLowerCase() : "";
  if (latestStatus === "l2_processing") {
    return "already_processing";
  }

  const resolvedAt =
    typeof latest.resolved_at === "string" ? latest.resolved_at : null;
  if (resolvedAt) {
    const ageMs = Date.now() - new Date(resolvedAt).getTime();
    if (ageMs >= 0 && ageMs < PROCESSING_WINDOW_MS) {
      return "recently_processed";
    }
  }

  const { data: claimedRows, error: claimError } = await adminClient
    .from("escalations")
    .update({
      status: "l2_processing",
      resolved_by: "l2_agent",
    })
    .eq("id", escalation.id)
    .eq("status", "pending")
    .select("id");

  if (claimError) {
    throw new Error(
      `Failed to claim escalation ${escalation.id}: ${claimError.message}`,
    );
  }

  if (!claimedRows || claimedRows.length === 0) {
    return "lost_race";
  }

  return "claimed";
}

async function finalizeEscalation(
  adminClient: ReturnType<typeof getAdminClient>,
  escalationId: string,
  status: string,
  functionCalled: string,
  functionArgs: Record<string, unknown>,
) {
  const { error } = await adminClient
    .from("escalations")
    .update({
      status,
      resolved_by: "l2_agent",
      resolved_at: new Date().toISOString(),
      l2_function_called: functionCalled,
      l2_function_args: functionArgs,
    })
    .eq("id", escalationId);

  if (error) {
    throw new Error(
      `Failed to finalize escalation ${escalationId}: ${error.message}`,
    );
  }
}

async function resetEscalationClaim(
  adminClient: ReturnType<typeof getAdminClient>,
  escalationId: string,
) {
  await adminClient
    .from("escalations")
    .update({
      status: "pending",
      resolved_by: null,
      resolved_at: null,
    })
    .eq("id", escalationId)
    .eq("status", "l2_processing");
}

type L2RunOptions = {
  escalationId?: string;
  minAgeMinutes?: number;
  triggerMode: "sweep" | "event";
  l1Result?: Record<string, unknown> | null;
};

async function runL2Responder(request: NextRequest, options: L2RunOptions) {
  const adminClient = getAdminClient();
  const baseUrl = process.env.INTERNAL_API_URL ?? request.nextUrl.origin;

  const minAgeMinutes =
    typeof options.minAgeMinutes === "number" && options.minAgeMinutes > 0
      ? options.minAgeMinutes
      : 0;

  let query = adminClient
    .from("escalations")
    .select("*")
    .eq("status", "pending");

  if (options.escalationId) {
    query = query.eq("id", options.escalationId).limit(1);
  } else {
    if (minAgeMinutes > 0) {
      const cutoffIso = new Date(
        Date.now() - minAgeMinutes * 60 * 1000,
      ).toISOString();
      query = query.lte("created_at", cutoffIso);
    }

    query = query.order("created_at", { ascending: true }).limit(10);
  }

  const { data, error } = await query;

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
  let huntTriggered = 0;
  let errors = 0;
  let skipped = 0;

  const results: ProcessResult[] = [];

  for (const escalation of escalations) {
    let decision: Decision | null = null;
    const startedAt = Date.now();
    const tenantId = resolveEscalationTenantId(escalation, options.l1Result);

    try {
      const claimState = await claimEscalation(adminClient, escalation);
      if (claimState !== "claimed") {
        skipped += 1;
        await writeLifecycleAudit(adminClient, "skipped", escalation, {
          skip_reason: claimState,
          trigger_mode: options.triggerMode,
        }, tenantId);
        continue;
      }

      await writeLifecycleAudit(adminClient, "received", escalation, {
        status_before: escalation.status,
        trigger_mode: options.triggerMode,
      }, tenantId);

      const decisionStartedAt = Date.now();
      decision = await getDecision(escalation);
      const executionTimeMs = Date.now() - decisionStartedAt;

      await writeLifecycleAudit(adminClient, "decision", escalation, {
        action: decision.decision,
        execute: decision.execute,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      }, tenantId);

      const actionsTaken: string[] = [decision.decision];
      let statusAfter = "awaiting_human";
      let outcomeAction = "manual_review";
      let actionFired = false;

      if (decision.execute && decision.decision === "ISOLATE_IDENTITY") {
        await writeLifecycleAudit(adminClient, "action_taken", escalation, {
          action: "ISOLATE_IDENTITY",
          target_user_id: escalation.affected_user_id,
        }, tenantId);

        await callInternalAction(baseUrl, "/api/actions/isolate-identity", {
          targetUserId: escalation.affected_user_id,
          reason: `L2 Auto-Response: ${escalation.description}`,
          tenantId,
        });
        triggerSigmaRuleGeneration(baseUrl, escalation.alert_id);

        statusAfter = "auto_resolved";
        outcomeAction = "isolate_identity";
        actionFired = true;

        autoResolved += 1;
      } else if (decision.execute && decision.decision === "BLOCK_IP") {
        await writeLifecycleAudit(adminClient, "action_taken", escalation, {
          action: "BLOCK_IP",
          target_ip: escalation.affected_ip,
        }, tenantId);

        await callInternalAction(baseUrl, "/api/actions/block-ip", {
          ip: escalation.affected_ip,
          reason: `L2 Auto-Response: ${escalation.description}`,
          threatLevel: escalation.severity,
          tenantId,
        });
        triggerSigmaRuleGeneration(baseUrl, escalation.alert_id);

        statusAfter = "auto_resolved";
        outcomeAction = "block_ip";
        actionFired = true;

        autoResolved += 1;
      } else {
        await writeLifecycleAudit(adminClient, "action_taken", escalation, {
          action: "MANUAL_REVIEW",
          reason: decision.reasoning,
          execute: false,
        }, tenantId);

        manualReview += 1;
      }

      await finalizeEscalation(
        adminClient,
        escalation.id,
        statusAfter,
        outcomeAction,
        {
          tenant_id: tenantId,
          decision_action: decision.decision,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          executed: actionFired,
          trigger_mode: options.triggerMode,
        },
      );

      await writeLifecycleAudit(adminClient, "outcome", escalation, {
        outcome: "completed",
        status_after: statusAfter,
        action_fired: actionFired,
        action_taken: decision.decision,
      }, tenantId);

      await saveReasoningChain({
        escalation_id: escalation.id,
        agent_level: "L2",
        decision: decision.decision,
        confidence_score: decision.confidence,
        reasoning_text: decision.reasoning,
        iocs_considered: [
          {
            severity: escalation.severity,
            affected_user_id: escalation.affected_user_id,
            affected_ip: escalation.affected_ip,
            source: inferAlertSource(escalation),
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
        model_used:
          decision.reasoning === "gemini_unavailable"
            ? `${GEMINI_MODEL}:fallback`
            : GEMINI_MODEL,
        execution_time_ms: executionTimeMs,
      });

      processed += 1;
      results.push({
        escalation_id: escalation.id,
        execute: decision.execute,
        action: decision.decision,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        outcome: "completed",
        status: statusAfter,
        duration_ms: Date.now() - startedAt,
      });
    } catch (batchError) {
      errors += 1;

      await resetEscalationClaim(adminClient, escalation.id);

      await writeLifecycleAudit(adminClient, "outcome", escalation, {
        outcome: "failed",
        error:
          batchError instanceof Error ? batchError.message : "unknown_error",
        fallback_reasoning: decision?.reasoning || null,
      }, tenantId);

      results.push({
        escalation_id: escalation.id,
        execute: false,
        action: decision?.decision || "MANUAL_REVIEW",
        confidence: decision?.confidence ?? 0,
        reasoning: decision?.reasoning || "processing_failed",
        outcome: "failed",
        status: "pending",
        duration_ms: Date.now() - startedAt,
      });

      console.error("[L2 responder] escalation processing failed", {
        escalation_id: escalation.id,
        error: batchError,
      });
    }
  }

  return NextResponse.json({
    success: true,
    trigger_mode: options.triggerMode,
    processed,
    auto_resolved: autoResolved,
    manual_review: manualReview,
    hunt_triggered: huntTriggered,
    errors,
    skipped,
    results,
  });
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return runL2Responder(request, {
    triggerMode: "sweep",
    minAgeMinutes: SWEEP_ESCALATION_MIN_AGE_MINUTES,
  });
}

export async function POST(request: NextRequest) {
  if (!isInternalAgentAuthorized(request) && !isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};

  try {
    const parsed = (await request.json()) as Record<string, unknown>;
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    body = {};
  }

  const escalationId =
    typeof body.escalation_id === "string" &&
    body.escalation_id.trim().length > 0
      ? body.escalation_id.trim()
      : undefined;
  const minAgeRaw =
    typeof body.min_age_minutes === "number"
      ? body.min_age_minutes
      : typeof body.min_age_minutes === "string"
        ? Number(body.min_age_minutes)
        : NaN;
  const minAgeMinutes = Number.isFinite(minAgeRaw)
    ? Math.max(0, minAgeRaw)
    : undefined;
  const l1Result =
    body.l1_result && typeof body.l1_result === "object"
      ? (body.l1_result as Record<string, unknown>)
      : null;

  return runL2Responder(request, {
    escalationId,
    minAgeMinutes,
    triggerMode: "event",
    l1Result,
  });
}
