import { NextResponse } from "next/server";
import os from "os";
import { createClient } from "@supabase/supabase-js";
import { ollamaHealth } from "@/lib/ollama-client";
import { getAuthenticatedUser } from "@/lib/tenancy";
import { getServerRole } from "@/lib/rbac/serverRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getServerRole();
  if (!role || !["admin", "manager", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ollamaOnline = await ollamaHealth();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const connectedAgents = (global as any).connectedAgents as
    | Map<string, any>
    | undefined;
  const ipConnectionMap = (global as any).ipConnectionMap as
    | Map<string, number[]>
    | undefined;

  let rate_limited_ips = 0;
  if (ipConnectionMap) {
    const now = Date.now();
    for (const timestamps of ipConnectionMap.values()) {
      const recent = timestamps.filter((t) => now - t < 60000);
      if (recent.length > 10) {
        rate_limited_ips++;
      }
    }
  }

  const socMetricsSnapshot = {
    total_alerts: 0,
    alerts_closed: 0,
    alerts_escalated: 0,
    ips_blocked: 0,
    sigma_rules_generated: 0,
  };

  if (supabaseUrl && serviceRoleKey) {
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const { data, error } = await client
      .from("soc_metrics")
      .select(
        "total_alerts, alerts_closed, alerts_escalated, ips_blocked, sigma_rules_generated",
      )
      .gte("metric_date", start.toISOString().slice(0, 10))
      .lt("metric_date", end.toISOString().slice(0, 10));

    if (error) {
      console.error("[metrics] failed to query soc_metrics", error.message);
    } else {
      for (const row of data || []) {
        socMetricsSnapshot.total_alerts += Number(row.total_alerts || 0);
        socMetricsSnapshot.alerts_closed += Number(row.alerts_closed || 0);
        socMetricsSnapshot.alerts_escalated += Number(
          row.alerts_escalated || 0,
        );
        socMetricsSnapshot.ips_blocked += Number(row.ips_blocked || 0);
        socMetricsSnapshot.sigma_rules_generated += Number(
          row.sigma_rules_generated || 0,
        );
      }
    }
  }

  return NextResponse.json({
    active_ws_connections: connectedAgents ? connectedAgents.size : 0,
    rate_limited_ips,
    memory_used_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    cpu_count: os.cpus().length,
    uptime_seconds: Math.round(process.uptime()),
    total_alerts: socMetricsSnapshot.total_alerts,
    alerts_closed: socMetricsSnapshot.alerts_closed,
    alerts_escalated: socMetricsSnapshot.alerts_escalated,
    ips_blocked: socMetricsSnapshot.ips_blocked,
    sigma_rules_generated: socMetricsSnapshot.sigma_rules_generated,
    ollama_online: ollamaOnline,
  });
}

export async function POST() {
  try {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        uptime: 0,
      },
      { status: 500 },
    );
  }
}
