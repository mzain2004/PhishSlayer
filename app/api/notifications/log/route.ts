import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
        .from('notification_logs')
        .select('*, channel:notification_channels(name, type), rule:notification_rules(name)')
        .eq('org_id', orgId)
        .order('sent_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
}
