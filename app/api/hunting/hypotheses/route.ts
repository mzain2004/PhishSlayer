import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HypothesisSchema = z.object({
  organization_id: z.string().uuid(),
  title: z.string(),
  hypothesis: z.string().optional(),
  mitre_technique: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  data_sources: z.array(z.string()).optional(),
  search_patterns: z.any().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hunt_hypotheses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = HypothesisSchema.parse(body);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hunt_hypotheses')
      .insert({ ...validated, status: 'pending' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
