import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STAGE_TIMEOUT_MS = 30_000;
const L3_TRIGGER_ACTIONS = new Set(["HUNT", "BLOCK_IP", "ISOLATE_IDENTITY"]);

const WazuhAlertSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    timestamp: z.union([z.string(), z.number()]),
    rule: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        level: z.coerce.number().int().min(0).max(15).optional(),
        description: z.string().optional(),
        groups: z.array(z.string()).optional(),
        mitre: z
          .object({
            technique: z.array(z.string()).optional(),
            tactic: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
    agent: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional(),
        ip: z.string().optional(),
      })
      .optional(),
    data: z
      .object({
        srcip: z.string().optional(),
        dstip: z.string().optional(),
        process: z
          .object({
            name: z.string().optional(),
            pid: z.union([z.string(), z.number()]).optional(),
          })
          .optional(),
        process_name: z.string().optional(),
      })
      .passthrough()
      .optional(),
    syscheck: z
      .object({
        path: z.string().optional(),
        sha256_after: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

type WazuhAlert = z.infer<typeof WazuhAlertSchema>;

type Severity = "low" | "medium" | "high" | "critical";

type L1ChainResult = {
  decision: "CLOSE" | "ESCALATE";
  confidence: number;
  escalation_id: string | null;
  duration_ms: number;
  timed_out: boolean;
  error: string | null;
};

type L2ChainResult = {
  action: "ISOLATE_IDENTITY" | "BLOCK_IP" | "HUNT" | "MANUAL_REVIEW";
  confidence: number;
  reasoning: string | null;
  duration_ms: number;
  timed_out: boolean;
  error: string | null;
};

type L3ChainResult = {
  findings_count: number;
  duration_ms: number;
  timed_out: boolean;
  error: string | null;
};

type ChainExecutionResult = {
  alert_id: string;
  l1: L1ChainResult;
  l2: L2ChainResult | null;
  l3: L3ChainResult | null;
  stages_executed: string[];
  total_duration_ms: number;
  success: boolean;
};

type StageCallResult = {
  ok: boolean;
  status: number;
  data: unknown;
  duration_ms: number;
  timed_out: boolean;
  error: string | null;
};

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function normalizeTimestamp(value: string | number): string {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function toText(value: string | number | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function mapRuleLevelToSeverity(level: number | null): Severity {
  if (level === null) {
    return "low";
  }

  if (level >= 14) {
    return "critical";
  }

  if (level >= 12) {
    return "high";
  }

  if (level >= 10) {
    return "medium";
  }

  return "low";
}

async function writeAuditLogSafe(
  action: string,
  severity: Severity,
  metadata: Record<string, unknown>,
) {
  try {
    const { error } = await getAdminClient().from("audit_logs").insert({
      action,
      severity,
      metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[wazuh webhook] Failed to write audit log", {
        action,
        details: error.message,
      });
    }
  } catch (error) {
    console.error("[wazuh webhook] Unexpected audit log failure", {
      action,
      error,
    });
  }
}

async function callStageJson(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<StageCallResult> {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      AGENT_SECRET: process.env.AGENT_SECRET || "",
    };

    if (process.env.CRON_SECRET) {
      headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: payload,
        duration_ms: Date.now() - startedAt,
        timed_out: false,
        error: `HTTP_${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload,
      duration_ms: Date.now() - startedAt,
      timed_out: false,
      error: null,
    };
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted|timeout/i.test(error.message));

    return {
      ok: false,
      status: 0,
      data: null,
      duration_ms: Date.now() - startedAt,
      timed_out: timedOut,
      error: timedOut
        ? "STAGE_TIMEOUT"
        : error instanceof Error
          ? error.message
          : "UNKNOWN_STAGE_ERROR",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractL1Result(
  data: unknown,
  alertId: string,
): {
  decision: "CLOSE" | "ESCALATE";
  confidence: number;
  escalation_id: string | null;
} {
  const fallback = {
    decision: "ESCALATE" as const,
    confidence: 0,
    escalation_id: null,
  };

  if (!data || typeof data !== "object") {
    return fallback;
  }

  const rows = (data as { results?: unknown }).results;
  if (!Array.isArray(rows)) {
    return fallback;
  }

  const match = rows.find((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }

    const cast = row as { item_id?: unknown; alert_id?: unknown };
    return cast.item_id === alertId || cast.alert_id === alertId;
  });

  if (!match || typeof match !== "object") {
    return fallback;
  }

  const row = match as {
    decision?: unknown;
    confidence?: unknown;
    escalation_id?: unknown;
  };

  const decision =
    row.decision === "CLOSE" || row.decision === "ESCALATE"
      ? row.decision
      : "ESCALATE";
  const confidence =
    typeof row.confidence === "number" && Number.isFinite(row.confidence)
      ? row.confidence
      : 0;
  const escalationId =
    typeof row.escalation_id === "string" && row.escalation_id.length > 0
      ? row.escalation_id
      : null;

  return {
    decision,
    confidence,
    escalation_id: escalationId,
  };
}

function extractL2Result(
  data: unknown,
  escalationId: string | null,
): {
  action: "ISOLATE_IDENTITY" | "BLOCK_IP" | "HUNT" | "MANUAL_REVIEW";
  confidence: number;
  reasoning: string | null;
} {
  const fallback = {
    action: "HUNT" as const,
    confidence: 0,
    reasoning: null,
  };

  if (!data || typeof data !== "object") {
    return fallback;
  }

  const rows = (data as { results?: unknown }).results;
  if (!Array.isArray(rows) || rows.length === 0) {
    return fallback;
  }

  const match = escalationId
    ? rows.find((row) => {
        if (!row || typeof row !== "object") {
          return false;
        }
        const cast = row as { escalation_id?: unknown };
        return cast.escalation_id === escalationId;
      })
    : rows[0];

  if (!match || typeof match !== "object") {
    return fallback;
  }

  const row = match as {
    action?: unknown;
    confidence?: unknown;
    reasoning?: unknown;
  };
  const action =
    row.action === "ISOLATE_IDENTITY" ||
    row.action === "BLOCK_IP" ||
    row.action === "HUNT" ||
    row.action === "MANUAL_REVIEW"
      ? row.action
      : "HUNT";
  const confidence =
    typeof row.confidence === "number" && Number.isFinite(row.confidence)
      ? row.confidence
      : 0;
  const reasoning =
    typeof row.reasoning === "string" && row.reasoning.trim().length > 0
      ? row.reasoning
      : null;

  return { action, confidence, reasoning };
}

function extractL3FindingsCount(data: unknown): number {
  if (!data || typeof data !== "object") {
    return 0;
  }

  const hunter = (data as { hunter?: unknown }).hunter;
  if (!hunter || typeof hunter !== "object") {
    return 0;
  }

  const hits = (hunter as { hits_found?: unknown }).hits_found;
  return typeof hits === "number" && Number.isFinite(hits) ? hits : 0;
}

async function getEscalationIdByAlertId(
  alertId: string,
): Promise<string | null> {
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from("escalations")
      .select("id")
      .eq("alert_id", alertId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return typeof data?.id === "string" ? data.id : null;
  } catch {
    return null;
  }
}

async function runEventDrivenAgentChain(
  baseUrl: string,
  alertId: string,
  severity: Severity,
): Promise<ChainExecutionResult> {
  const chainStartedAt = Date.now();
  const stagesExecuted: string[] = [];

  await writeAuditLogSafe("AGENT_CHAIN_STARTED", severity, {
    alert_id: alertId,
    severity,
    source: "wazuh",
    started_at: new Date(chainStartedAt).toISOString(),
  });

  const l1Stage = await callStageJson(
    `${baseUrl}/api/agent/triage`,
    {
      alert_id: alertId,
      include_scans: false,
      alert_min_age_minutes: 0,
    },
    STAGE_TIMEOUT_MS,
  );

  const l1Extracted = l1Stage.ok
    ? extractL1Result(l1Stage.data, alertId)
    : {
        decision: "ESCALATE" as const,
        confidence: 0,
        escalation_id: null,
      };

  let escalationId = l1Extracted.escalation_id;
  if (l1Extracted.decision === "ESCALATE" && !escalationId) {
    escalationId = await getEscalationIdByAlertId(alertId);
  }

  const l1Result: L1ChainResult = {
    decision: l1Extracted.decision,
    confidence: l1Extracted.confidence,
    escalation_id: escalationId,
    duration_ms: l1Stage.duration_ms,
    timed_out: l1Stage.timed_out,
    error: l1Stage.error,
  };

  stagesExecuted.push("L1");

  await writeAuditLogSafe("L1_COMPLETED", severity, {
    alert_id: alertId,
    decision: l1Result.decision,
    confidence: l1Result.confidence,
    escalation_id: l1Result.escalation_id,
    duration_ms: l1Result.duration_ms,
    timed_out: l1Result.timed_out,
    error: l1Result.error,
  });

  let l2Result: L2ChainResult | null = null;
  let l3Result: L3ChainResult | null = null;

  if (l1Result.decision === "ESCALATE") {
    await writeAuditLogSafe("L2_TRIGGERED", severity, {
      alert_id: alertId,
      escalation_id: l1Result.escalation_id,
    });

    if (!l1Result.escalation_id) {
      l2Result = {
        action: "HUNT",
        confidence: 0,
        reasoning: "Escalation id missing after L1 escalation decision.",
        duration_ms: 0,
        timed_out: false,
        error: "ESCALATION_ID_MISSING",
      };

      stagesExecuted.push("L2");

      await writeAuditLogSafe("L2_COMPLETED", severity, {
        alert_id: alertId,
        escalation_id: null,
        action: l2Result.action,
        confidence: l2Result.confidence,
        reasoning: l2Result.reasoning,
        duration_ms: l2Result.duration_ms,
        timed_out: l2Result.timed_out,
        error: l2Result.error,
      });
    } else {
      const l2Stage = await callStageJson(
        `${baseUrl}/api/cron/l2-respond`,
        {
          escalation_id: l1Result.escalation_id,
          min_age_minutes: 0,
          l1_result: {
            decision: l1Result.decision,
            confidence: l1Result.confidence,
            escalation_id: l1Result.escalation_id,
          },
        },
        STAGE_TIMEOUT_MS,
      );

      const l2Extracted = l2Stage.ok
        ? extractL2Result(l2Stage.data, l1Result.escalation_id)
        : {
            action: "HUNT" as const,
            confidence: 0,
            reasoning:
              typeof l2Stage.error === "string"
                ? `L2 stage failed: ${l2Stage.error}`
                : null,
          };

      l2Result = {
        action: l2Extracted.action,
        confidence: l2Extracted.confidence,
        reasoning: l2Extracted.reasoning,
        duration_ms: l2Stage.duration_ms,
        timed_out: l2Stage.timed_out,
        error: l2Stage.error,
      };

      stagesExecuted.push("L2");

      await writeAuditLogSafe("L2_COMPLETED", severity, {
        alert_id: alertId,
        escalation_id: l1Result.escalation_id,
        action: l2Result.action,
        confidence: l2Result.confidence,
        reasoning: l2Result.reasoning,
        duration_ms: l2Result.duration_ms,
        timed_out: l2Result.timed_out,
        error: l2Result.error,
      });
    }

    if (L3_TRIGGER_ACTIONS.has(l2Result.action)) {
      const l2Context = {
        action: l2Result.action,
        confidence: l2Result.confidence,
        reasoning: l2Result.reasoning,
        duration_ms: l2Result.duration_ms,
        timed_out: l2Result.timed_out,
        error: l2Result.error,
      };

      await writeAuditLogSafe("L3_TRIGGERED", severity, {
        alert_id: alertId,
        escalation_id: l1Result.escalation_id,
        reason: l2Result.action,
        l2_context: l2Context,
      });

      const l3Stage = await callStageJson(
        `${baseUrl}/api/cron/l3-hunt`,
        {
          trigger_reason: `l2_action_${l2Result.action}`,
          min_hunt_record_age_minutes: 0,
          l2_context: l2Context,
        },
        STAGE_TIMEOUT_MS,
      );

      l3Result = {
        findings_count: l3Stage.ok ? extractL3FindingsCount(l3Stage.data) : 0,
        duration_ms: l3Stage.duration_ms,
        timed_out: l3Stage.timed_out,
        error: l3Stage.error,
      };

      stagesExecuted.push("L3");

      await writeAuditLogSafe("L3_COMPLETED", severity, {
        alert_id: alertId,
        escalation_id: l1Result.escalation_id,
        findings_count: l3Result.findings_count,
        duration_ms: l3Result.duration_ms,
        timed_out: l3Result.timed_out,
        error: l3Result.error,
      });
    }
  }

  const totalDurationMs = Date.now() - chainStartedAt;
  const chainSuccess =
    !l1Result.error &&
    (!l2Result || !l2Result.error) &&
    (!l3Result || !l3Result.error);

  await writeAuditLogSafe("AGENT_CHAIN_COMPLETED", severity, {
    alert_id: alertId,
    started_at: new Date(chainStartedAt).toISOString(),
    total_duration_ms: totalDurationMs,
    stages_executed: stagesExecuted,
    chain_success: chainSuccess,
  });

  return {
    alert_id: alertId,
    l1: l1Result,
    l2: l2Result,
    l3: l3Result,
    stages_executed: stagesExecuted,
    total_duration_ms: totalDurationMs,
    success: chainSuccess,
  };
}

function normalizeAlert(input: WazuhAlert): WazuhAlert {
  return {
    ...input,
    timestamp: normalizeTimestamp(input.timestamp),
  };
}

function parseIncomingAlerts(payload: unknown): {
  validAlerts: WazuhAlert[];
  invalidCount: number;
} {
  const rawAlerts: unknown[] = [];

  if (Array.isArray(payload)) {
    rawAlerts.push(...payload);
  } else if (payload && typeof payload === "object") {
    const asObject = payload as { alerts?: unknown };
    if (Array.isArray(asObject.alerts)) {
      rawAlerts.push(...asObject.alerts);
    } else {
      rawAlerts.push(payload);
    }
  }

  const validAlerts: WazuhAlert[] = [];
  let invalidCount = 0;

  for (const rawAlert of rawAlerts) {
    const parsed = WazuhAlertSchema.safeParse(rawAlert);
    if (!parsed.success) {
      invalidCount += 1;
      continue;
    }

    validAlerts.push(normalizeAlert(parsed.data));
  }

  return { validAlerts, invalidCount };
}

async function processSingleAlert(
  alert: WazuhAlert,
  baseUrl: string,
): Promise<{
  external_alert_id: string | null;
  internal_alert_id: string | null;
  level: number | null;
  queued: boolean;
  chain: ChainExecutionResult | null;
}> {
  const ruleLevel = alert.rule?.level ?? null;
  const severity = mapRuleLevelToSeverity(ruleLevel);

  await writeAuditLogSafe("WAZUH_ALERT_RECEIVED", severity, {
    source: "wazuh",
    external_alert_id: toText(alert.id),
    rule_id: toText(alert.rule?.id),
    rule_level: ruleLevel,
    rule_description: alert.rule?.description || null,
    agent_name: alert.agent?.name || null,
    src_ip: alert.data?.srcip || null,
    dst_ip: alert.data?.dstip || null,
  });

  let insertedAlertId: string | null = null;
  let queued = false;

  try {
    insertedAlertId = await queueAlert(alert);
    queued = Boolean(insertedAlertId);
  } catch (error) {
    console.error("[wazuh webhook] Failed to insert alert", error);
  }

  await writeAuditLogSafe("WAZUH_ALERT_PROCESSED", severity, {
    source: "wazuh",
    processing_mode: "event_driven_queue",
    external_alert_id: toText(alert.id),
    internal_alert_id: insertedAlertId,
    queued,
  });

  let chain: ChainExecutionResult | null = null;

  if (queued && insertedAlertId) {
    triggerCtemExposure(baseUrl, alert, insertedAlertId);
    chain = await runEventDrivenAgentChain(baseUrl, insertedAlertId, severity);
  } else {
    await writeAuditLogSafe("WAZUH_ALERT_DECISION", severity, {
      source: "wazuh",
      external_alert_id: toText(alert.id),
      internal_alert_id: insertedAlertId,
      decision: "ESCALATE",
      confidence: 0,
      reasoning: "Failed to queue alert for event-driven chain.",
    });
    await writeAuditLogSafe("WAZUH_ALERT_ACTION_TAKEN", severity, {
      source: "wazuh",
      external_alert_id: toText(alert.id),
      internal_alert_id: insertedAlertId,
      action_taken: "QUEUE_FAILED",
    });
  }

  return {
    external_alert_id: toText(alert.id),
    internal_alert_id: insertedAlertId,
    level: ruleLevel,
    queued,
    chain,
  };
}

function buildAlertSummary(alert: WazuhAlert): string {
  const details = [
    `rule=${alert.rule?.description || "unknown"}`,
    `level=${alert.rule?.level ?? "unknown"}`,
    `agent=${alert.agent?.name || "unknown"}`,
    `src_ip=${alert.data?.srcip || "unknown"}`,
    `dst_ip=${alert.data?.dstip || "unknown"}`,
  ];

  return details.join(" | ");
}

function triggerCtemExposure(
  baseUrl: string,
  alert: WazuhAlert,
  alertId: string | null,
) {
  if (!alertId) {
    return;
  }

  const severity = mapRuleLevelToSeverity(alert.rule?.level ?? null);
  const exposurePayload = {
    asset_name: alert.agent?.name || "unknown-agent",
    asset_type: "server",
    exposure_type: alert.rule?.description || "Wazuh rule alert",
    severity,
    description: buildAlertSummary(alert),
    alert_id: alertId,
  };

  void fetch(`${baseUrl}/api/detection/ctem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(exposurePayload),
  })
    .then(async (response) => {
      if (!response.ok) {
        const details = await response.text();
        console.error("[wazuh webhook] CTEM trigger failed", {
          alert_id: alertId,
          status: response.status,
          details,
        });
      }
    })
    .catch((error) => {
      console.error("[wazuh webhook] CTEM trigger error", {
        alert_id: alertId,
        error,
      });
    });
}

async function queueAlert(alert: WazuhAlert): Promise<string | null> {
  const adminClient = getAdminClient();
  const ruleLevel = alert.rule?.level ?? null;

  const insertResult = (await withTimeout(
    adminClient
      .from("alerts")
      .insert({
        source: "wazuh",
        rule_level: ruleLevel,
        rule_id: toText(alert.rule?.id),
        rule_description: alert.rule?.description ?? null,
        rule_groups: alert.rule?.groups ?? [],
        agent_id: toText(alert.agent?.id),
        agent_name: alert.agent?.name ?? null,
        agent_ip: alert.agent?.ip ?? null,
        src_ip: alert.data?.srcip ?? null,
        dest_ip: alert.data?.dstip ?? null,
        process_name:
          alert.data?.process?.name ?? alert.data?.process_name ?? null,
        process_id: toText(alert.data?.process?.pid),
        file_path: alert.syscheck?.path ?? null,
        file_hash_sha256: alert.syscheck?.sha256_after ?? null,
        mitre_technique_id: alert.rule?.mitre?.technique?.[0] ?? null,
        mitre_tactic: alert.rule?.mitre?.tactic?.[0] ?? null,
        full_payload: alert,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
    2200,
    "Timed out while inserting alert",
  )) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return insertResult.data?.id ?? null;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.WAZUH_WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization") || "";

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      console.error("[wazuh webhook] Invalid JSON payload", error);
      return NextResponse.json({
        received: true,
        total_received: 0,
        total_valid: 0,
        total_invalid: 0,
        processed: 0,
      });
    }

    const { validAlerts, invalidCount } = parseIncomingAlerts(payload);
    if (validAlerts.length === 0) {
      return NextResponse.json({
        received: true,
        total_received: Array.isArray(payload) ? payload.length : 1,
        total_valid: 0,
        total_invalid: invalidCount,
        processed: 0,
      });
    }

    const baseUrl = process.env.INTERNAL_API_URL ?? request.nextUrl.origin;

    const settled = await Promise.allSettled(
      validAlerts.map((alert) => processSingleAlert(alert, baseUrl)),
    );

    const successfulResults = settled
      .filter(
        (
          item,
        ): item is PromiseFulfilledResult<{
          external_alert_id: string | null;
          internal_alert_id: string | null;
          level: number | null;
          queued: boolean;
          chain: ChainExecutionResult | null;
        }> => item.status === "fulfilled",
      )
      .map((item) => item.value);

    const failedCount = settled.length - successfulResults.length;
    const firstResult = successfulResults[0] || null;

    return NextResponse.json({
      received: true,
      total_received: validAlerts.length + invalidCount,
      total_valid: validAlerts.length,
      total_invalid: invalidCount,
      processed: successfulResults.length,
      failed: failedCount,
      level: firstResult?.level ?? null,
      queued: firstResult?.queued ?? false,
      triggered_l1: firstResult?.chain?.stages_executed.includes("L1") ?? false,
      results: successfulResults,
    });
  } catch (error) {
    console.error("[wazuh webhook] Unexpected error", error);
    return NextResponse.json({
      received: true,
      total_received: 0,
      total_valid: 0,
      total_invalid: 0,
      processed: 0,
      failed: 1,
    });
  }
}
