import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateMTTD, calculateMTTR, calculateFPRate } from '@/lib/metrics/calculator';
import { calculateOrgRiskScore } from '@/lib/metrics/risk-score';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!verifyCronAuth(req)) {
        return unauthorizedResponse();
    }

    try {
        const { data: orgs } = await supabaseAdmin.from('organizations').select('id');
        if (!orgs) return NextResponse.json({ success: true, message: 'No organizations to process' });

        for (const org of orgs) {
            const orgId = org.id;

            // 1. Calculate Core Metrics
            const mttd = await calculateMTTD(orgId, '30d');
            const mttr = await calculateMTTR(orgId, '30d');
            const fpRate = await calculateFPRate(orgId);
            const riskScore = await calculateOrgRiskScore(orgId);

            // 2. Insert Timeseries Data
            const metrics = [
                { org_id: orgId, metric_name: 'mttd_seconds', metric_value: mttd },
                { org_id: orgId, metric_name: 'mttr_seconds', metric_value: mttr },
                { org_id: orgId, metric_name: 'fp_rate', metric_value: fpRate },
                { org_id: orgId, metric_name: 'risk_score', metric_value: riskScore }
            ];

            await supabaseAdmin.from('metrics_timeseries').insert(metrics);
        }

        return NextResponse.json({ success: true, processed_orgs: orgs.length });
    } catch (error: any) {
        console.error('[MetricsCron] Fatal error:', error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return POST(req);
}
