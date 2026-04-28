import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VulnSchema = z.object({
  organization_id: z.string().uuid(),
  asset_id: z.string().uuid().optional(),
  cve_id: z.string(),
  cvss_score: z.number().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  affected_product: z.string().optional(),
  patch_available: z.boolean().optional().default(false),
  status: z.enum(['open', 'in_progress', 'resolved', 'accepted']).optional().default('open'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const supabase = await createClient();
    let query = supabase.from('vulnerabilities').select('*');

    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('cvss_score', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = VulnSchema.parse(body);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vulnerabilities')
      .insert(validated)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
