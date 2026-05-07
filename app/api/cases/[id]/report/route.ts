import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateForensicReport } from '@/lib/forensics/reportGenerator';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('forensic_reports')
    .select('*')
    .eq('case_id', id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return NextResponse.json(existing.report_data);

  try {
    const report = await generateForensicReport(id, orgId);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const report = await generateForensicReport(id, orgId);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
