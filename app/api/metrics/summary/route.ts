import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMTTD, calculateMTTR, calculateFPRate } from '@/lib/metrics/calculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const supabase = await createClient();
        
        // Fetch last risk score from organizations
        const { data: org } = await supabase
            .from('organizations')
            .select('org_risk_score, risk_level, last_metrics_update')
            .eq('id', orgId)
            .single();

        // Calculate fresh time metrics
        const mttd = await calculateMTTD(orgId, '30d');
        const mttr = await calculateMTTR(orgId, '30d');
        const fpRate = await calculateFPRate(orgId);

        return NextResponse.json({
            risk_score: org?.org_risk_score || 0,
            risk_level: org?.risk_level || 'LOW',
            last_update: org?.last_metrics_update,
            mttd_seconds: mttd,
            mttr_seconds: mttr,
            false_positive_rate: fpRate
        });

    } catch (error: any) {
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
