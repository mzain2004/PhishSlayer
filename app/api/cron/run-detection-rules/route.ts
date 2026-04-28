import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runDetectionRules } from '@/lib/detection/sigmaEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Get alerts from the last hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: alerts, error: alertError } = await supabase
      .from('alerts')
      .select('*')
      .gt('created_at', oneHourAgo);

    if (alertError) throw alertError;

    const detections = [];

    for (const alert of alerts || []) {
       const matches = await runDetectionRules(alert.metadata || {}, alert.organization_id);
       
       for (const match of matches) {
          // Create a new "detection" alert
          const { error: insError } = await supabase.from('alerts').insert({
            organization_id: alert.organization_id,
            title: `Detection: ${match.ruleName}`,
            severity: match.severity,
            status: 'new',
            type: 'detection',
            metadata: {
              source_alert_id: alert.id,
              rule_id: match.ruleId,
              matched_at: match.matchedAt
            }
          });
          
          if (!insError) {
            detections.push({ alertId: alert.id, rule: match.ruleName });
          }
       }
    }

    return NextResponse.json({ success: true, detections_created: detections.length });
  } catch (error) {
    console.error('[Detection Rules Cron] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
