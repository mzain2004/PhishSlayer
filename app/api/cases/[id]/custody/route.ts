import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyCustodyChain } from '@/lib/forensics/chainOfCustody';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: records } = await supabase
    .from('forensic_custody')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: true });

  const verification = await verifyCustodyChain(id);

  return NextResponse.json({
    records,
    verification
  });
}
