import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('credential_leaks')
      .select('*')
      .eq('is_resolved', false)
      .order('discovered_at', { ascending: false });

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
