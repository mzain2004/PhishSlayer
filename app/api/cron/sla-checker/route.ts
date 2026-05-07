import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkSlaBreach } from '@/lib/sla/tracker';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Fetch open cases with breached SLAs
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id')
    .eq('sla_breached', false)
    .not('status', 'in', '("resolved","closed")')
    .lt('sla_due_at', now);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

  let breachCount = 0;
  for (const c of cases) {
    const breached = await checkSlaBreach(c.id);
    if (breached) breachCount++;
  }

  return NextResponse.json({ status: 'completed', casesChecked: cases.length, breached: breachCount });
}
