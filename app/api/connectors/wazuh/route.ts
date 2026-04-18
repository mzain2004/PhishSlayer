import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

async function triggerL1Triage(baseUrl: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    await fetch(`${baseUrl}/api/agent/triage`, {
      method: "POST",
      headers: {
        AGENT_SECRET: process.env.AGENT_SECRET || "",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function mapRuleLevelToSeverity(
  level: number | null,
): "low" | "medium" | "high" | "critical" {
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
  severity: "low" | "medium" | "high" | "critical",
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
        level: null,
        queued: false,
        triggered_l1: false,
      });
    }

    const parsed = WazuhAlertSchema.safeParse(payload);
    if (!parsed.success) {
      console.error(
        "[wazuh webhook] Payload validation failed",
        parsed.error.flatten(),
      );
      return NextResponse.json({
        received: true,
        level: null,
        queued: false,
        triggered_l1: false,
      });
    }

    const alert = parsed.data;
    const normalizedAlert: WazuhAlert = {
      ...alert,
      timestamp: normalizeTimestamp(alert.timestamp),
    };

    const ruleLevel = normalizedAlert.rule?.level ?? null;
    const severity = mapRuleLevelToSeverity(ruleLevel);

    await writeAuditLogSafe("WAZUH_ALERT_RECEIVED", severity, {
      source: "wazuh",
      external_alert_id: toText(normalizedAlert.id),
      rule_id: toText(normalizedAlert.rule?.id),
      rule_level: ruleLevel,
      rule_description: normalizedAlert.rule?.description || null,
      agent_name: normalizedAlert.agent?.name || null,
      src_ip: normalizedAlert.data?.srcip || null,
      dst_ip: normalizedAlert.data?.dstip || null,
    });

    if ((ruleLevel ?? 0) < 7) {
      await writeAuditLogSafe("WAZUH_ALERT_PROCESSED", severity, {
        source: "wazuh",
        processing_mode: "prefilter",
        external_alert_id: toText(normalizedAlert.id),
        rule_level: ruleLevel,
      });
      await writeAuditLogSafe("WAZUH_ALERT_DECISION", severity, {
        source: "wazuh",
        external_alert_id: toText(normalizedAlert.id),
        decision: "CLOSE",
        confidence: 1,
        reasoning: "Alert rule level is below triage threshold (rule_level < 7).",
      });
      await writeAuditLogSafe("WAZUH_ALERT_ACTION_TAKEN", severity, {
        source: "wazuh",
        external_alert_id: toText(normalizedAlert.id),
        action_taken: "IGNORED_BELOW_THRESHOLD",
      });

      return NextResponse.json({
        received: true,
        level: ruleLevel,
        queued: false,
        triggered_l1: false,
      });
    }

    let queued = false;
    let insertedAlertId: string | null = null;
    let triggeredL1 = false;

    try {
      insertedAlertId = await queueAlert(normalizedAlert);
      queued = Boolean(insertedAlertId);
    } catch (error) {
      console.error("[wazuh webhook] Failed to insert alert", error);
    }

    await writeAuditLogSafe("WAZUH_ALERT_PROCESSED", severity, {
      source: "wazuh",
      processing_mode: "l1_queue",
      external_alert_id: toText(normalizedAlert.id),
      internal_alert_id: insertedAlertId,
      queued,
    });

    if (queued) {
      const baseUrl = process.env.INTERNAL_API_URL ?? request.nextUrl.origin;
      triggerCtemExposure(baseUrl, normalizedAlert, insertedAlertId);
    } else {
      await writeAuditLogSafe("WAZUH_ALERT_DECISION", severity, {
        source: "wazuh",
        external_alert_id: toText(normalizedAlert.id),
        internal_alert_id: insertedAlertId,
        decision: "ESCALATE",
        confidence: 0,
        reasoning: "Failed to queue alert for L1 triage.",
      });
      await writeAuditLogSafe("WAZUH_ALERT_ACTION_TAKEN", severity, {
        source: "wazuh",
        external_alert_id: toText(normalizedAlert.id),
        internal_alert_id: insertedAlertId,
        action_taken: "QUEUE_FAILED",
      });
    }

    if ((ruleLevel ?? 0) >= 12) {
      try {
        await withTimeout(
          triggerL1Triage(request.nextUrl.origin),
          2600,
          "Timed out while triggering L1 triage",
        );
        triggeredL1 = true;
      } catch (error) {
        console.error("[wazuh webhook] Failed to trigger L1 triage", error);
      }
    }

    return NextResponse.json({
      received: true,
      level: ruleLevel,
      queued,
      triggered_l1: triggeredL1,
    });
  } catch (error) {
    console.error("[wazuh webhook] Unexpected error", error);
    return NextResponse.json({
      received: true,
      level: null,
      queued: false,
      triggered_l1: false,
    });
  }
}
