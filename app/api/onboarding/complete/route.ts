import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgFilter = orgId ?? userId;

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ onboarded: true, setup_complete: true })
    .or(`id.eq.${orgFilter},owner_id.eq.${userId}`);

  if (error) {
    // Non-fatal: column may not exist yet — still redirect the user
    console.warn('[onboarding/complete]', error.message);
  }

  return NextResponse.json({ ok: true });
}
