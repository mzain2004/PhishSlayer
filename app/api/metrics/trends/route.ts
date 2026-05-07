import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const metric = searchParams.get('metric');
    const period = searchParams.get('period') || '30d';

    if (!metric) return NextResponse.json({ error: 'Metric name is required' }, { status: 400 });

    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;

    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase
            .from('metrics_timeseries')
            .select('metric_value, recorded_at')
            .eq('org_id', orgId)
            .eq('metric_name', metric)
            .gte('recorded_at', new Date(Date.now() - days * 86400000).toISOString())
            .order('recorded_at', { ascending: true });

        if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
