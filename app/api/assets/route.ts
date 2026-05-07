import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const assetSchema = z.object({
  asset_type: z.enum(['endpoint', 'server', 'network_device', 'cloud_resource', 'saas_app', 'identity']),
  hostname: z.string().optional(),
  ip_addresses: z.array(z.string()).default([]),
  mac_address: z.string().optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  department: z.string().optional(),
  owner_user_id: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const criticality = searchParams.get('criticality');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;

  const supabase = await createClient();
  let query = supabase.from('asset_inventory').select('*', { count: 'exact' }).eq('organization_id', orgId);

  if (type) query = query.eq('asset_type', type);
  if (criticality) query = query.eq('criticality', criticality);

  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('last_seen', { ascending: false });

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = assetSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('asset_inventory')
      .insert({
        ...validated,
        organization_id: orgId,
        last_seen: new Date().toISOString(),
        first_seen: new Date().toISOString()
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 400 });
  }
}
