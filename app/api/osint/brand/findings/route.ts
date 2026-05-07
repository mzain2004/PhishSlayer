import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { apiPaginated, apiError, API_CODES } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('osint_findings')
    .select("id, organization_id, type, severity, source, details, created_at", { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

  return apiPaginated(data || [], count || 0, page, limit);
}
