import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichAlert } from '@/lib/enrichment/orchestrator';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  
  // Fetch unenriched alerts from last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('id, organization_id')
    .eq('threat_intel_enriched', false)
    .gt('created_at', oneDayAgo)
    .limit(50);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

  let successCount = 0;
  for (const alert of alerts) {
    try {
      await enrichAlert(alert.id, alert.organization_id);
      successCount++;
      // 2s delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`Cron enrichment failed for alert ${alert.id}:`, err);
    }
  }

  return NextResponse.json({ status: 'completed', processed: alerts.length, success: successCount });
}
