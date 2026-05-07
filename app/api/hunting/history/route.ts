import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = await createClient();
    // Fetch completed hunts with findings
    const { data, error } = await supabase
      .from('hunt_hypotheses')
      .select('*')
      .eq('organization_id', orgId)
      .in('status', ['COMPLETED', 'NO_FINDINGS'])
      .order('executed_at', { ascending: false });

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
