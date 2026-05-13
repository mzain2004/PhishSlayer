import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { tagAlertWithMitre } from '@/lib/mitre/tagger';
import { z } from "zod";

const schema = z.object({ alertId: z.string().optional(), caseId: z.string().optional() }).strict();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { orgId, userId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const { alertId, caseId } = parsed.data;
    const supabase = await createClient();

    if (alertId) {
      const { data: alert } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', alertId)
        .eq('organization_id', orgId)
        .single();

      if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

      const tags = await tagAlertWithMitre({
        title: alert.title,
        description: alert.description,
        rawPayload: alert.raw_data,
        sourceType: alert.source,
        iocs: alert.cve_ids || []
      });

      if (tags.length > 0) {
        await supabase
          .from('alerts')
          .update({ mitre_techniques: tags.map(t => t.techniqueId), mitre_tagged_at: new Date().toISOString() })
          .eq('id', alertId);

        const tagInserts = tags.map(t => ({
          organization_id: orgId,
          alert_id: alertId,
          technique_id: t.techniqueId,
          technique_name: t.techniqueName,
          tactic: t.tactic,
          confidence: t.confidence,
          reasoning: t.reasoning
        }));

        await supabase.from('mitre_alert_tags').upsert(tagInserts, { onConflict: 'alert_id,technique_id' });
      }

      return NextResponse.json(tags);
    }

    if (caseId) {
      const { data: caseData } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('organization_id', orgId)
        .single();

      if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

      // Build context for case (summary of alerts)
      const { data: alerts } = await supabase.from('alerts').select('*').eq('case_id', caseId);
      
      const context = {
        title: caseData.title,
        description: caseData.description,
        rawPayload: alerts?.map(a => a.title).join(', '),
        sourceType: 'Case Aggregation',
        iocs: Array.from(new Set(alerts?.flatMap(a => a.cve_ids || []) || []))
      };

      const tags = await tagAlertWithMitre(context);

      if (tags.length > 0) {
        const tagInserts = tags.map(t => ({
          organization_id: orgId,
          case_id: caseId,
          technique_id: t.techniqueId,
          technique_name: t.techniqueName,
          tactic: t.tactic,
          confidence: t.confidence,
          reasoning: t.reasoning
        }));

        await supabase.from('mitre_case_tags').upsert(tagInserts, { onConflict: 'case_id,technique_id' });
      }

      return NextResponse.json(tags);
    }

    return NextResponse.json({ error: 'Missing alertId or caseId' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
