import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlertRow = {
  created_at: string | null;
  severity?: string | null;
  rule_level?: number | null;
};

type TelemetryPoint = {
  slot: string;
  label: string;
  total: number;
  critical: number;
};

function toIsoMinute(date: Date) {
  const normalized = new Date(date);
  normalized.setUTCSeconds(0, 0);
  return normalized.toISOString();
}

function toLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let useRuleLevelFallback = false;

    const primary = await supabase
      .from("alerts")
      .select("created_at, severity")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    let data = (primary.data ?? null) as AlertRow[] | null;
    let error = primary.error;

    if (
      error &&
      /column\s+.*severity\s+does\s+not\s+exist/i.test(error.message)
    ) {
      useRuleLevelFallback = true;

      const fallback = await supabase
        .from("alerts")
        .select("created_at, rule_level")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      data = (fallback.data ?? null) as AlertRow[] | null;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json(
        { error: `Failed to query alerts: ${error.message}` },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as AlertRow[];
    const slotMap = new Map<string, TelemetryPoint>();

    for (
      let cursor = new Date(since);
      cursor <= now;
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000)
    ) {
      const slot = toIsoMinute(cursor);
      slotMap.set(slot, {
        slot,
        label: toLabel(cursor),
        total: 0,
        critical: 0,
      });
    }

    for (const row of rows) {
      if (!row.created_at) {
        continue;
      }

      const createdAt = new Date(row.created_at);
      createdAt.setUTCMinutes(0, 0, 0);
      const slot = createdAt.toISOString();

      const existing = slotMap.get(slot);
      if (!existing) {
        continue;
      }

      existing.total += 1;
      const isCriticalBySeverity =
        typeof row.severity === "string" &&
        row.severity.toLowerCase() === "critical";
      const isCriticalByRuleLevel =
        typeof row.rule_level === "number" && row.rule_level >= 14;

      if (isCriticalBySeverity || isCriticalByRuleLevel) {
        existing.critical += 1;
      }
    }

    const points = Array.from(slotMap.values()).sort((a, b) =>
      a.slot.localeCompare(b.slot),
    );

    const hasData = points.some((point) => point.total > 0);

    return NextResponse.json({
      points,
      hasData,
      rangeHours: 24,
      sourceField: useRuleLevelFallback ? "rule_level" : "severity",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to build telemetry",
      },
      { status: 500 },
    );
  }
}
