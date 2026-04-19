import { createClient } from "@supabase/supabase-js";

export interface SocMetricsRecord {
  id?: string;
  organization_id: string | null;
  metric_date: string;
  total_alerts: number;
  alerts_closed: number;
  alerts_escalated: number;
  mean_time_to_detect_ms: number;
  mean_time_to_respond_ms: number;
  false_positive_rate: number;
  l1_processed: number;
  l2_processed: number;
  l3_hunts: number;
  sigma_rules_generated: number;
  ips_blocked: number;
  identities_isolated: number;
  created_at?: string;
}

interface MetricTrend {
  today: number;
  seven_day_average: number;
  delta: number;
  delta_percent: number;
}

export interface MetricsSummary {
  metrics: SocMetricsRecord[];
  trends: {
    mean_time_to_detect_ms: MetricTrend;
    mean_time_to_respond_ms: MetricTrend;
    false_positive_rate: MetricTrend;
    total_alerts: MetricTrend;
    alerts_closed: MetricTrend;
    alerts_escalated: MetricTrend;
    l1_processed: MetricTrend;
    l2_processed: MetricTrend;
    l3_hunts: MetricTrend;
  };
  generated_at: string;
}

type CountQuery = {
  table: string;
  timestampColumn?: string;
  start: string;
  end: string;
  organizationId?: string;
  organizationColumn?: string;
  extraFilters?: (query: any) => any;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getUtcDayBounds(date = new Date()) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    dateOnly: start.toISOString().slice(0, 10),
  };
}

function avg(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function countRows({
  table,
  timestampColumn = "created_at",
  start,
  end,
  organizationId,
  organizationColumn,
  extraFilters,
}: CountQuery): Promise<number> {
  const client = getServiceClient();

  let query = client
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(timestampColumn, start)
    .lt(timestampColumn, end);

  if (organizationId && organizationColumn) {
    query = query.eq(organizationColumn, organizationId);
  }

  if (extraFilters) {
    query = extraFilters(query);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed counting ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function countRowsWithTimestampFallback(
  baseQuery: Omit<CountQuery, "timestampColumn">,
  timestampColumns: string[],
): Promise<number> {
  let lastError: Error | null = null;

  for (const timestampColumn of timestampColumns) {
    try {
      return await countRows({
        ...baseQuery,
        timestampColumn,
      });
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Failed counting rows with timestamp fallback");

      // If the column is missing, try the next candidate column.
      if (!/column .* does not exist/i.test(lastError.message)) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Failed counting rows with timestamp fallback");
}

function buildTrend(today: number, comparison: number[]): MetricTrend {
  const sevenDayAverage = avg(comparison);
  const delta = today - sevenDayAverage;
  const deltaPercent =
    sevenDayAverage === 0
      ? today === 0
        ? 0
        : 100
      : (delta / sevenDayAverage) * 100;

  return {
    today,
    seven_day_average: Number(sevenDayAverage.toFixed(2)),
    delta: Number(delta.toFixed(2)),
    delta_percent: Number(deltaPercent.toFixed(2)),
  };
}

export async function calculateDailyMetrics(
  organizationId?: string,
): Promise<SocMetricsRecord> {
  const client = getServiceClient();
  const { startIso, endIso, dateOnly } = getUtcDayBounds();

  const alertsQuery = client
    .from("alerts")
    .select("id, created_at, status")
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (organizationId) {
    alertsQuery.eq("organization_id", organizationId);
  }

  const { data: alerts, error: alertsError } = await alertsQuery;
  if (alertsError) {
    throw new Error(`Failed to query alerts: ${alertsError.message}`);
  }

  const alertRows = alerts || [];
  const alertIds = alertRows.map((row: any) => row.id).filter(Boolean);

  const totalAlerts = alertRows.length;
  const alertsClosed = alertRows.filter(
    (row: any) => row.status === "auto_closed" || row.status === "closed",
  ).length;
  const alertsEscalated = alertRows.filter(
    (row: any) => row.status === "escalated",
  ).length;

  const escalationsProcessed = await countRows({
    table: "escalations",
    start: startIso,
    end: endIso,
    extraFilters: (query) => query.neq("status", "pending"),
  });

  const sigmaRulesGenerated = await countRows({
    table: "sigma_rules",
    start: startIso,
    end: endIso,
  });

  const ipsBlocked = await countRows({
    table: "blocked_ips",
    timestampColumn: "blocked_at",
    start: startIso,
    end: endIso,
  });

  const identitiesIsolated = await countRows({
    table: "audit_logs",
    start: startIso,
    end: endIso,
    extraFilters: (query) => query.eq("action", "IDENTITY_ISOLATED"),
  });

  let meanTimeToDetectMs = 0;
  if (alertIds.length > 0) {
    const reasoningQuery = client
      .from("agent_reasoning")
      .select("alert_id, created_at")
      .eq("agent_level", "L1")
      .in("alert_id", alertIds)
      .order("created_at", { ascending: true });

    const { data: l1ReasoningRows, error: l1ReasoningError } =
      await reasoningQuery;

    if (l1ReasoningError) {
      throw new Error(
        `Failed to query L1 reasoning records: ${l1ReasoningError.message}`,
      );
    }

    const firstDecisionByAlert = new Map<string, string>();
    for (const row of l1ReasoningRows || []) {
      if (!row.alert_id || firstDecisionByAlert.has(row.alert_id)) {
        continue;
      }

      firstDecisionByAlert.set(row.alert_id, row.created_at);
    }

    const intervals: number[] = [];
    for (const alert of alertRows) {
      const firstDecision = firstDecisionByAlert.get(alert.id);
      if (!firstDecision) {
        continue;
      }

      const createdAt = new Date(alert.created_at).getTime();
      const decidedAt = new Date(firstDecision).getTime();
      if (Number.isNaN(createdAt) || Number.isNaN(decidedAt)) {
        continue;
      }

      intervals.push(Math.max(0, decidedAt - createdAt));
    }

    meanTimeToDetectMs = Math.round(avg(intervals));
  }

  const escalationsQuery = client
    .from("escalations")
    .select("id, created_at")
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (organizationId) {
    escalationsQuery.eq("organization_id", organizationId);
  }

  const { data: escalations, error: escalationsError } = await escalationsQuery;
  if (escalationsError) {
    throw new Error(`Failed to query escalations: ${escalationsError.message}`);
  }

  const escalationRows = escalations || [];
  const escalationIds = escalationRows
    .map((row: any) => row.id)
    .filter(Boolean);

  let meanTimeToRespondMs = 0;
  if (escalationIds.length > 0) {
    const { data: l2ReasoningRows, error: l2ReasoningError } = await client
      .from("agent_reasoning")
      .select("escalation_id, created_at")
      .eq("agent_level", "L2")
      .in("escalation_id", escalationIds)
      .order("created_at", { ascending: true });

    if (l2ReasoningError) {
      throw new Error(
        `Failed to query L2 reasoning records: ${l2ReasoningError.message}`,
      );
    }

    const firstDecisionByEscalation = new Map<string, string>();
    for (const row of l2ReasoningRows || []) {
      if (
        !row.escalation_id ||
        firstDecisionByEscalation.has(row.escalation_id)
      ) {
        continue;
      }

      firstDecisionByEscalation.set(row.escalation_id, row.created_at);
    }

    const intervals: number[] = [];
    for (const escalation of escalationRows) {
      const firstDecision = firstDecisionByEscalation.get(escalation.id);
      if (!firstDecision) {
        continue;
      }

      const createdAt = new Date(escalation.created_at).getTime();
      const decidedAt = new Date(firstDecision).getTime();
      if (Number.isNaN(createdAt) || Number.isNaN(decidedAt)) {
        continue;
      }

      intervals.push(Math.max(0, decidedAt - createdAt));
    }

    meanTimeToRespondMs = Math.round(avg(intervals));
  }

  const l1Processed = await countRows({
    table: "agent_reasoning",
    start: startIso,
    end: endIso,
    extraFilters: (query) => query.eq("agent_level", "L1"),
  });

  const l3Hunts = await countRows({
    table: "agent_reasoning",
    start: startIso,
    end: endIso,
    extraFilters: (query) => query.eq("agent_level", "L3"),
  });

  const falsePositiveRate =
    totalAlerts === 0 ? 0 : Number((alertsClosed / totalAlerts).toFixed(4));

  const record: SocMetricsRecord = {
    organization_id: organizationId ?? null,
    metric_date: dateOnly,
    total_alerts: totalAlerts,
    alerts_closed: alertsClosed,
    alerts_escalated: alertsEscalated,
    mean_time_to_detect_ms: meanTimeToDetectMs,
    mean_time_to_respond_ms: meanTimeToRespondMs,
    false_positive_rate: falsePositiveRate,
    l1_processed: l1Processed,
    l2_processed: escalationsProcessed,
    l3_hunts: l3Hunts,
    sigma_rules_generated: sigmaRulesGenerated,
    ips_blocked: ipsBlocked,
    identities_isolated: identitiesIsolated,
  };

  if (organizationId) {
    const { data, error } = await client
      .from("soc_metrics")
      .upsert(record, { onConflict: "organization_id,metric_date" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to upsert soc_metrics: ${error?.message || "unknown error"}`,
      );
    }

    return data as SocMetricsRecord;
  }

  const { data: existing, error: existingError } = await client
    .from("soc_metrics")
    .select("id")
    .is("organization_id", null)
    .eq("metric_date", dateOnly)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check existing global soc_metrics row: ${existingError.message}`,
    );
  }

  if (existing?.id) {
    const { data: updated, error: updateError } = await client
      .from("soc_metrics")
      .update(record)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(
        `Failed to update global soc_metrics row: ${updateError?.message || "unknown error"}`,
      );
    }

    return updated as SocMetricsRecord;
  }

  const { data: inserted, error: insertError } = await client
    .from("soc_metrics")
    .insert(record)
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to insert global soc_metrics row: ${insertError?.message || "unknown error"}`,
    );
  }

  return inserted as SocMetricsRecord;
}

export async function getMetricsSummary(
  organizationId?: string,
): Promise<MetricsSummary> {
  const client = getServiceClient();
  let query = client
    .from("soc_metrics")
    .select("*")
    .order("metric_date", { ascending: false })
    .limit(30);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch soc_metrics summary: ${error.message}`);
  }

  const metrics = (data || []) as SocMetricsRecord[];
  const today = metrics[0];
  const previousSeven = metrics.slice(1, 8);

  const mapValues = (selector: (metric: SocMetricsRecord) => number) =>
    previousSeven.map(selector);

  return {
    metrics,
    trends: {
      mean_time_to_detect_ms: buildTrend(
        today?.mean_time_to_detect_ms ?? 0,
        mapValues((metric) => metric.mean_time_to_detect_ms),
      ),
      mean_time_to_respond_ms: buildTrend(
        today?.mean_time_to_respond_ms ?? 0,
        mapValues((metric) => metric.mean_time_to_respond_ms),
      ),
      false_positive_rate: buildTrend(
        today?.false_positive_rate ?? 0,
        mapValues((metric) => metric.false_positive_rate),
      ),
      total_alerts: buildTrend(
        today?.total_alerts ?? 0,
        mapValues((metric) => metric.total_alerts),
      ),
      alerts_closed: buildTrend(
        today?.alerts_closed ?? 0,
        mapValues((metric) => metric.alerts_closed),
      ),
      alerts_escalated: buildTrend(
        today?.alerts_escalated ?? 0,
        mapValues((metric) => metric.alerts_escalated),
      ),
      l1_processed: buildTrend(
        today?.l1_processed ?? 0,
        mapValues((metric) => metric.l1_processed),
      ),
      l2_processed: buildTrend(
        today?.l2_processed ?? 0,
        mapValues((metric) => metric.l2_processed),
      ),
      l3_hunts: buildTrend(
        today?.l3_hunts ?? 0,
        mapValues((metric) => metric.l3_hunts),
      ),
    },
    generated_at: new Date().toISOString(),
  };
}
