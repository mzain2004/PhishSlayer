import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the globally exposed agentControl from server.js
    if (!(global as any).agentControl?.getAgentList) {
      return NextResponse.json({ agents: [] });
    }

    const agents = (global as any).agentControl.getAgentList();

    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('[API] Error listing agents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
