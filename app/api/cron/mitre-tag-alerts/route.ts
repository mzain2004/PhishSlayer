import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { batchTagAlerts } from '@/lib/mitre/tagger';
import { calculateOrgCoverage } from '@/lib/mitre/coverage';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('id, organization_id')
    .is('mitre_tagged_at', null)
    .gt('created_at', fortyEightHoursAgo)
    .limit(30);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

  // Group by org to batch tag
  const orgMap: Record<string, string[]> = {};
  alerts?.forEach(a => {
    if (!orgMap[a.organization_id]) orgMap[a.organization_id] = [];
    orgMap[a.organization_id].push(a.id);
  });

  const results = [];
  for (const [orgId, ids] of Object.entries(orgMap)) {
    try {
      await batchTagAlerts(ids, orgId);
      await calculateOrgCoverage(orgId);
      results.push({ orgId, tagged: ids.length });
    } catch (err: any) {
      console.error('[mitre-tag-alerts]', orgId, err);
      results.push({ orgId, error: 'INTERNAL_SERVER_ERROR' });
    }
  }

  return NextResponse.json({ status: 'completed', processed: alerts?.length || 0, results });
}
