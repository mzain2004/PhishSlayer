import { NextRequest, NextResponse } from 'next/server';
import { fetchCvssData } from '@/lib/enrichment/cvss';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ cveId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cveId } = await params;

  try {
    const data = await fetchCvssData(cveId);
    if (!data) return NextResponse.json({ error: 'CVE not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
