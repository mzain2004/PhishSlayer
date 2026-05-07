import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { apiSuccess, apiError, API_CODES } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hunt_hypotheses')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);
    return apiSuccess(data);
  } catch (error) {
    return apiError(API_CODES.INTERNAL_ERROR, 'Internal Server Error', 500);
  }
}
