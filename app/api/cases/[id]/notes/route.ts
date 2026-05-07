import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('case_timeline')
        .insert({
            case_id: id,
            org_id: orgId,
            event_type: 'note_added',
            actor: body.actor || 'Analyst',
            description: body.note,
            metadata: body.metadata || {}
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

    return NextResponse.json(data);
}
