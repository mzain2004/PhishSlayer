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
  const { data: configRecord, error: configError } = await supabase
    .from('connector_configs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (configError || !configRecord) {
    return NextResponse.json({ error: 'Connector config not found' }, { status: 404 });
  }

  try {
    const connector = createConnector(configRecord);
    const since = configRecord.last_synced_at 
      ? new Date(configRecord.last_synced_at) 
      : new Date(Date.now() - 15 * 60 * 1000); // Default to last 15 mins

    const events = await connector.pullEvents(since);

    if (events.length > 0) {
      const { error: insertError } = await supabase
        .from('connector_events')
        .insert(events.map(e => ({
          organization_id: orgId,
          connector_id: id,
          event_type: e.source,
          severity: e.severity,
          raw_payload: e.rawPayload,
          normalized_fields: e.normalizedFields,
          ingested_at: new Date().toISOString()
        })));

      if (insertError) throw insertError;
    }

    // Update last_synced_at
    await supabase
      .from('connector_configs')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', id);

    // Trigger L1 agent processing (mocked for now)
    // await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/l1/process`, { method: 'POST' });

    return NextResponse.json({ success: true, count: events.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
