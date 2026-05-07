import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createClient();

    const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    return NextResponse.json(campaign);
}
