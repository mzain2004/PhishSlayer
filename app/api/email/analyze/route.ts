import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseEmailHeaders } from '@/lib/email/headerParser';
import { analyzeHeadersWithGroq } from '@/lib/email/groqAnalyzer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AnalyzeSchema = z.object({
  rawHeaders: z.string(),
  organizationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = AnalyzeSchema.parse(body);
    const { rawHeaders, organizationId } = validatedData;

    // 1. Parse Headers
    const parsedData = await parseEmailHeaders(rawHeaders);

    // 2. AI Analysis
    const groqAnalysis = await analyzeHeadersWithGroq(rawHeaders, parsedData);

    // 3. Save to Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_analyses')
      .insert({
        organization_id: organizationId,
        raw_headers: rawHeaders,
        parsed_data: parsedData,
        groq_analysis: groqAnalysis,
        risk_score: parsedData.riskScore,
        flags: parsedData.suspiciousFlags,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
