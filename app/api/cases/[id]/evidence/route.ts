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
        .from('case_evidence')
        .insert({
            case_id: id,
            org_id: orgId,
            evidence_type: body.evidence_type,
            file_url: body.file_url,
            text_content: body.text_content,
            collected_by: body.collected_by || 'User',
            hash_sha256: body.hash_sha256
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

    // Log to timeline
    await supabase.from('case_timeline').insert({
        case_id: id,
        org_id: orgId,
        event_type: 'agent_action',
        actor: body.collected_by || 'User',
        description: `Attached new evidence of type: ${body.evidence_type}`
    });

    return NextResponse.json(data);
}
