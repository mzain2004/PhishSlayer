import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Rollback trigger - in a real system this would call the executor's rollback logic
    const { data, error } = await supabaseAdmin
        .from('playbook_runs')
        .update({ status: 'ROLLED_BACK' })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json({ success: true, message: 'Rollback initiated', run: data });
}
