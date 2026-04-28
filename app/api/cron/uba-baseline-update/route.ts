import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateBaseline } from '@/lib/uba/baseline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Simple auth check for cron if needed
  // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const supabase = await createClient();
    
    // 1. Get all active orgs/users
    // In a real scenario, we'd query alerts/events to calculate real metrics.
    // For this build, we'll iterate through organization_members.
    const { data: members, error: memError } = await supabase
      .from('organization_members')
      .select('user_id, org_id');

    if (memError) throw memError;

    const results = [];
    for (const member of members || []) {
       // Mock aggregation logic:
       // Fetch last 30 days of activity from events/alerts
       // Calculate avg login hour, common IPs, alert frequency
       
       const mockBaselineData = {
         avgLoginHour: 9 + Math.floor(Math.random() * 8), // 9 AM to 5 PM
         commonIPs: ['192.168.1.10', '10.0.0.5'],
         alertFrequency: Math.floor(Math.random() * 5)
       };

       await updateBaseline(member.user_id, member.org_id, mockBaselineData);
       results.push({ userId: member.user_id, orgId: member.org_id, status: 'updated' });
    }

    return NextResponse.json({ success: true, processed: results.length });
  } catch (error) {
    console.error('[Baseline Update Cron] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
