import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildAttackTimeline } from '@/lib/forensics/timeline';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const timeline = await buildAttackTimeline(id, orgId);
    return NextResponse.json(timeline);
  } catch (error: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const timeline = await buildAttackTimeline(id, orgId);
    // Logic to invalidate cache or update DB would go here
    return NextResponse.json(timeline);
  } catch (error: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
