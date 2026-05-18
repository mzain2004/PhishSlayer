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

    const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

    if (caseError || !caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: timeline } = await supabase
        .from('case_timeline')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: true });

    const { data: evidence } = await supabase
        .from('case_evidence')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: true });

    return NextResponse.json({
        ...caseData,
        timeline: timeline || [],
        evidence: evidence || []
    });
}
