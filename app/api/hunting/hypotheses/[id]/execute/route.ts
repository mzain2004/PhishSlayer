import { NextRequest, NextResponse } from 'next/server';
import { executeHunt } from '@/lib/hunting/huntQuery';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // 1. Get hypothesis
    const { data: hypo, error: fetchError } = await supabase
      .from('hunt_hypotheses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !hypo) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });

    // 2. Determine hunt type from huntQuery (simplified)
    // In a real app, huntQuery would be parsed or use a better structure
    // For now we'll mock the execution logic
    const results = await executeHunt({
      type: 'behavior',
      value: hypo.title, // Placeholder
      organizationId: hypo.organization_id
    });

    // 3. Update findings_count
    await supabase
      .from('hunt_hypotheses')
      .update({ findings_count: results.length, status: 'completed' })
      .eq('id', id);

    return NextResponse.json({ success: true, findings: results.length, data: results });
  } catch (error) {
    console.error('Hunt execution error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
