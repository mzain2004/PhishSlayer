import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { apiSuccess, apiError, API_CODES } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

  return apiSuccess({ success: true });
}
