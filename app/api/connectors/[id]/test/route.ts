import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createConnector } from '@/lib/connectors/factory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: configRecord, error } = await supabase
    .from('connector_configs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (error || !configRecord) {
    return NextResponse.json({ error: 'Connector config not found' }, { status: 404 });
  }

  try {
    const connector = createConnector(configRecord);
    const success = await connector.testConnection();
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
