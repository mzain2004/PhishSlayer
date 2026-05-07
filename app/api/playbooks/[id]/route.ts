import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('playbooks')
        .update({
            name: body.name,
            description: body.description,
            trigger_conditions: body.trigger_conditions,
            steps: body.steps,
            status: body.status,
            human_approval_required: body.human_approval_required,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
}
