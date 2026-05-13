import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichAlert } from "@/lib/enrichment/orchestrator";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/security/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Fetch unenriched alerts from last 24h, scoped per org
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id");

  if (membershipError)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );

  const orgIds = Array.from(
    new Set(
      (memberships || []).map((row) => row.organization_id).filter(Boolean),
    ),
  );

  const alerts: Array<{ id: string; organization_id: string }> = [];
  for (const orgId of orgIds) {
    const { data: orgAlerts, error } = await supabase
      .from("alerts")
      .select("id, organization_id")
      .eq("organization_id", orgId)
      .eq("threat_intel_enriched", false)
      .gt("created_at", oneDayAgo)
      .limit(50);

    if (error)
      return NextResponse.json(
        { error: "INTERNAL_SERVER_ERROR" },
        { status: 500 },
      );
    if (orgAlerts) alerts.push(...orgAlerts);
  }

  let successCount = 0;
  for (const alert of alerts) {
    try {
      await enrichAlert(alert.id, alert.organization_id);
      successCount++;
      // 2s delay to avoid API rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`Cron enrichment failed for alert ${alert.id}:`, err);
    }
  }

  return NextResponse.json({
    status: "completed",
    processed: alerts.length,
    success: successCount,
  });
}
