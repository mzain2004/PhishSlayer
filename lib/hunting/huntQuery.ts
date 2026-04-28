import { createClient } from '../supabase/server';

export interface HuntParams {
  type: 'ip' | 'domain' | 'user' | 'behavior';
  value: string;
  organizationId: string;
}

export async function executeHunt(params: HuntParams) {
  const supabase = await createClient();
  let query = supabase.from('events').select('*').eq('organization_id', params.organizationId);

  switch (params.type) {
    case 'ip':
      query = query.or(`source_ip.eq.${params.value},destination_ip.eq.${params.value}`);
      break;
    case 'domain':
      query = query.ilike('dns_query', `%${params.value}%`);
      break;
    case 'user':
      query = query.eq('user_id', params.value);
      break;
    case 'behavior':
      // Simplified behavior check - looking for specific action
      query = query.eq('action', params.value);
      break;
  }

  const { data: events, error } = await query.limit(100);
  if (error) throw error;

  return events;
}
