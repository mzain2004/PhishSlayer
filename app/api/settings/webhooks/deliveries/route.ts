import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { apiPaginated, apiError, API_CODES } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '50');
  const endpointId = searchParams.get('endpoint_id');

  let query = supabaseAdmin
    .from('webhook_deliveries')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);

  if (endpointId) {
    query = query.eq('endpoint_id', endpointId);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

  return apiPaginated(data || [], count || 0, page, limit);
}
