import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // approval logic is a placeholder - in a real system we'd resume the executor
    // for this sprint, we just mark it as approved/completed
    const { data, error } = await supabaseAdmin
        .from('playbook_runs')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json({ success: true, run: data });
}
