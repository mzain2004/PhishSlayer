import { NextRequest, NextResponse } from 'next/server';
import { generateHypotheses } from '@/lib/hunting/hypothesisBuilder';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GenerateSchema = z.object({
  organizationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId } = GenerateSchema.parse(body);
    const supabase = await createClient();

    // 1. Pull recent alert patterns
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(20);

    // 2. Generate hypotheses
    const hypotheses = await generateHypotheses({
      orgId: organizationId,
      recentAlerts: alerts || [],
      mitreGaps: ['T1566', 'T1059'], // Mock gaps
      threatIntelFeeds: []
    });

    // 3. Save to DB
    const entries = hypotheses.map(h => ({
      organization_id: organizationId,
      title: h.title,
      hypothesis: h.hypothesis,
      mitre_technique: h.mitreTechnique,
      priority: h.priority,
      data_sources: h.dataSourcesNeeded,
      search_patterns: h.searchPatterns,
      ai_generated: true,
      status: 'pending'
    }));

    if (entries.length > 0) {
      const { error } = await supabase.from('hunt_hypotheses').insert(entries);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, count: entries.length, hypotheses: entries });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
