import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateAPIKey } from '@/lib/api-keys/manager';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default(['all']),
  expires_at: z.string().optional()
}).strict();

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at')
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, scopes, expires_at } = createSchema.parse(body);

    const result = await generateAPIKey(
      orgId,
      name,
      scopes,
      expires_at ? new Date(expires_at) : undefined
    );

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 400 });
  }
}
