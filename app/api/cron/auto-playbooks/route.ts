import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executePlaybook } from "@/lib/playbooks/executor";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/security/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // 1. Fetch critical/high alerts per org
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id");

  if (membershipError)
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    );

  const orgIds = Array.from(
    new Set(
      (memberships || []).map((row) => row.organization_id).filter(Boolean),
    ),
  );

  const alerts: any[] = [];
  for (const orgId of orgIds) {
    const { data: orgAlerts, error: orgAlertError } = await supabase
      .from("alerts")
      .select("*")
      .eq("organization_id", orgId)
      .in("severity", ["critical", "high"])
      .gt("created_at", fifteenMinsAgo);

    if (orgAlertError)
      return NextResponse.json(
        { error: orgAlertError.message },
        { status: 500 },
      );
    if (orgAlerts) alerts.push(...orgAlerts);
  }

  // 2. Fetch auto-trigger playbooks
  const { data: playbooks, error: playbookError } = await supabase
    .from("playbooks")
    .select("*")
    .eq("auto_trigger", true);

  if (playbookError)
    return NextResponse.json({ error: playbookError.message }, { status: 500 });

  let executionCount = 0;
  for (const alert of alerts) {
    // Check if already executed for this alert
    const { data: existing } = await supabase
      .from("playbook_executions")
      .select("id")
      .eq("trigger_data->alertId", alert.id)
      .maybeSingle();

    if (existing) continue;

    // Find matching playbook
    const matched = playbooks.find((p) => {
      const severityMap: any = { critical: 4, high: 3, medium: 2, low: 1 };
      const threshold = severityMap[p.severity_threshold?.toLowerCase()] || 3;
      return severityMap[alert.severity?.toLowerCase()] >= threshold;
    });

    if (matched) {
      await executePlaybook(
        matched.id,
        { alertId: alert.id, ...alert },
        alert.organization_id,
      );
      executionCount++;
    }
  }

  return NextResponse.json({
    status: "completed",
    alertsChecked: alerts.length,
    playbooksTriggered: executionCount,
  });
}
