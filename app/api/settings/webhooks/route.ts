import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { apiSuccess, apiError, API_CODES } from '@/lib/api/response';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  event_types: z.array(z.string()).min(1)
}).strict();

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { data, error } = await supabaseAdmin
    .from('webhook_endpoints')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

  return apiSuccess(data);
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  try {
    const body = await req.json();
    const validated = webhookSchema.parse(body);

    const secret = 'whsec_' + crypto.randomBytes(24).toString('base64url');

    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .insert({
        org_id: orgId,
        name: validated.name,
        url: validated.url,
        event_types: validated.event_types,
        secret: secret
      })
      .select()
      .single();

    if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

    return apiSuccess(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError(API_CODES.VALIDATION_ERROR, "Validation failed", 400, error.issues);
    }
    return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);
  }
}
