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
}).strict();

import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
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
