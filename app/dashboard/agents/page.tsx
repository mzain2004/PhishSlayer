import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AgentDashboard from '@/components/ui/agent-fleet/AgentDashboard';

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify role (manager, admin, or super_admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowedRoles = ['manager', 'admin', 'super_admin'];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Agent Fleet</h2>
      </div>
      <AgentDashboard />
    </div>
  );
}


