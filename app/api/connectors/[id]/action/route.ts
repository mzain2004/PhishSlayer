import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createConnector } from '@/lib/connectors/factory';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const actionSchema = z.object({
  actionType: z.enum(['block_ip', 'isolate_host', 'kill_process', 'quarantine_file']),
  target: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await auth();
  const { id } = await params;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = actionSchema.parse(body);

    const supabase = await createClient();
    
    // 1. Get config
    const { data: configRecord, error: configError } = await supabase
      .from('connector_configs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (configError || !configRecord) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    // 2. Log pending action
    const { data: actionRecord, error: logError } = await supabase
      .from('connector_actions')
      .insert({
        organization_id: orgId,
        connector_id: id,
        action_type: validated.actionType,
        target: validated.target,
        status: 'pending',
        initiated_by: userId,
      })
      .select()
      .single();

    if (logError) throw logError;

    // 3. Execute action
    const connector = createConnector(configRecord);
    const result = await connector.executeAction({
      type: validated.actionType as any,
      target: validated.target,
      metadata: validated.metadata
    });

    // 4. Update action status
    await supabase
      .from('connector_actions')
      .update({
        status: result.success ? 'success' : 'failed',
        result: result as any,
      })
      .eq('id', actionRecord.id);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 400 });
  }
}
