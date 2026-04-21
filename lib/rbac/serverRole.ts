import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import type { UserRole } from './roles';

export async function getServerRole(): Promise<UserRole | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return (data?.role as UserRole) || 'analyst';
}
