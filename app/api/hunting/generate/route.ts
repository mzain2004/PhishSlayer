import { NextRequest, NextResponse } from 'next/server';
import { generateAllHypotheses } from '@/lib/hunting/hypothesis-generator';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await generateAllHypotheses(orgId);
    return NextResponse.json({ success: true, message: 'Hypothesis generation triggered successfully' });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
