import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseSigmaRule } from '@/lib/detection/sigmaParser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RuleSchema = z.object({
  name: z.string(),
  type: z.enum(['sigma', 'yara', 'custom']),
  rule_content: z.string(),
  organization_id: z.string().uuid(),
  severity: z.string().optional().default('medium'),
  mitre_technique: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('detection_rules')
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
    const validated = RuleSchema.parse(body);

    let parsedRule = null;
    if (validated.type === 'sigma') {
      try {
        parsedRule = parseSigmaRule(validated.rule_content);
      } catch (e: any) {
        return NextResponse.json({ error: `Invalid Sigma Rule: ${e.message}` }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('detection_rules')
      .insert({
        ...validated,
        parsed_rule: parsedRule
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
