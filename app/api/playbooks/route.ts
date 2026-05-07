import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClient();
    
    // Select both platform-default (org_id is NULL) and org-specific playbooks
    const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('playbooks')
        .insert({
            org_id: orgId,
            name: body.name,
            description: body.description,
            trigger_conditions: body.trigger_conditions || {},
            steps: body.steps || [],
            status: body.status || 'DRAFT',
            human_approval_required: body.human_approval_required || false
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
