import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AuditRow = {
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ChainExecutionSummary = {
  alert_id: string;
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
  stages_executed: string[];
  chain_success: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item) => item.length > 0);
}

function toIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildCompletionSummaries(rows: AuditRow[]): ChainExecutionSummary[] {
  const completions = rows
    .filter((row) => row.action === "AGENT_CHAIN_COMPLETED")
    .map((row) => {
      const metadata = asRecord(row.metadata);
      const alertId = asString(metadata.alert_id);
      const duration = asNumber(metadata.total_duration_ms) || 0;
      const success = asBoolean(metadata.chain_success);
      const stages = asStringArray(metadata.stages_executed);

      if (!alertId) {
        return null;
      }

      return {
        alert_id: alertId,
        started_at: toIso(asString(metadata.started_at)) || row.created_at,
        completed_at: row.created_at,
        total_duration_ms: duration,
        stages_executed: stages,
        chain_success: success === null ? true : success,
      } as ChainExecutionSummary;
    })
    .filter((item): item is ChainExecutionSummary => item !== null);

  return completions;
}

function getCurrentExecution(rows: AuditRow[]): {
  running: boolean;
  alert_id: string | null;
  started_at: string | null;
  elapsed_ms: number;
  stages_executed: string[];
} {
  const sortedAsc = [...rows].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const completedAlerts = new Set<string>();
  let currentAlertId: string | null = null;
  let currentStartedAt: string | null = null;

  for (const row of sortedAsc) {
    const metadata = asRecord(row.metadata);
    const alertId = asString(metadata.alert_id);
    if (!alertId) {
      continue;
    }

    if (row.action === "AGENT_CHAIN_COMPLETED") {
      completedAlerts.add(alertId);
      if (currentAlertId === alertId) {
        currentAlertId = null;
        currentStartedAt = null;
      }
      continue;
    }

    if (row.action === "AGENT_CHAIN_STARTED") {
      if (!completedAlerts.has(alertId)) {
        currentAlertId = alertId;
        currentStartedAt = row.created_at;
      }
    }
  }

  if (!currentAlertId || !currentStartedAt) {
    return {
      running: false,
      alert_id: null,
      started_at: null,
      elapsed_ms: 0,
      stages_executed: [],
    };
  }

  const now = Date.now();
  const startedMs = new Date(currentStartedAt).getTime();
  if (Number.isNaN(startedMs)) {
    return {
      running: false,
      alert_id: null,
      started_at: null,
      elapsed_ms: 0,
      stages_executed: [],
    };
  }

  const elapsedMs = Math.max(0, now - startedMs);
  if (elapsedMs > 15 * 60 * 1000) {
    return {
      running: false,
      alert_id: null,
      started_at: null,
      elapsed_ms: 0,
      stages_executed: [],
    };
  }

  const stages = rows
    .filter((row) => {
      const metadata = asRecord(row.metadata);
      return asString(metadata.alert_id) === currentAlertId;
    })
    .map((row) => {
      if (row.action === "L1_COMPLETED") return "L1";
      if (row.action === "L2_COMPLETED") return "L2";
      if (row.action === "L3_COMPLETED") return "L3";
      return "";
    })
    .filter((stage) => stage.length > 0);

  const uniqueStages = Array.from(new Set(stages));

  return {
    running: true,
    alert_id: currentAlertId,
    started_at: currentStartedAt,
    elapsed_ms: elapsedMs,
    stages_executed: uniqueStages,
  };
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      success: false,
      error: "Missing Supabase configuration",
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const trackedActions = [
    "AGENT_CHAIN_STARTED",
    "L1_COMPLETED",
    "L2_TRIGGERED",
    "L2_COMPLETED",
    "L3_TRIGGERED",
    "L3_COMPLETED",
    "AGENT_CHAIN_COMPLETED",
  ];

  const { data, error } = await client
    .from("audit_logs")
    .select("action, metadata, created_at")
    .in("action", trackedActions)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }

  const rows = ((data || []) as AuditRow[]).map((row) => ({
    action: row.action,
    metadata: asRecord(row.metadata),
    created_at: row.created_at,
  }));

  const completionSummaries = buildCompletionSummaries(rows);
  const lastTen = completionSummaries.slice(0, 10);
  const successCount = lastTen.filter((item) => item.chain_success).length;
  const durationSum = lastTen.reduce(
    (total, item) => total + item.total_duration_ms,
    0,
  );

  const lastExecution = lastTen[0] || null;
  const currentExecution = getCurrentExecution(rows);

  return NextResponse.json({
    success: true,
    current_execution: currentExecution,
    last_execution: lastExecution
      ? {
          alert_id: lastExecution.alert_id,
          completed_at: lastExecution.completed_at,
          total_duration_ms: lastExecution.total_duration_ms,
          stages_executed: lastExecution.stages_executed,
          outcome: lastExecution.chain_success ? "SUCCESS" : "FAILED",
        }
      : null,
    success_rate_last_10:
      lastTen.length > 0 ? Number((successCount / lastTen.length).toFixed(2)) : 0,
    average_duration_ms:
      lastTen.length > 0 ? Math.round(durationSum / lastTen.length) : 0,
    sample_size: lastTen.length,
  });
}
