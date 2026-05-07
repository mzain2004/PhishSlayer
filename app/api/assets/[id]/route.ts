import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateSchema = z.object({
  hostname: z.string().optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  department: z.string().optional(),
  owner_user_id: z.string().optional(),
  is_active: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('asset_inventory')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('asset_inventory')
      .update(validated)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('asset_inventory')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  return NextResponse.json({ success: true });
}
