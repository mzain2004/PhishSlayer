import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  
  // 1. Get asset details to get hostname/IPs
  const { data: asset, error: assetError } = await supabase
    .from('asset_inventory')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (assetError || !asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  // 2. Fetch alerts
  let query = supabase.from('alerts')
    .select('*')
    .eq('organization_id', orgId);

  if (asset.hostname && asset.ip_addresses?.length > 0) {
    query = query.or(`hostname.eq."${asset.hostname}",source_ip.in.(${asset.ip_addresses.map((ip: string) => `"${ip}"`).join(',')})`);
  } else if (asset.hostname) {
    query = query.eq('hostname', asset.hostname);
  } else if (asset.ip_addresses?.length > 0) {
    query = query.in('source_ip', asset.ip_addresses);
  } else {
    return NextResponse.json([]);
  }

  const { data: alerts, error } = await query.order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  return NextResponse.json(alerts);
}
