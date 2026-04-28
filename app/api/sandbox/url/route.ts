import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { detonateUrls } from '@/lib/sandbox/detonator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UrlScanSchema = z.object({
  urls: z.array(z.string().url()),
  organizationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urls, organizationId } = UrlScanSchema.parse(body);

    const scanResults = await detonateUrls(urls.join('\n'));
    const supabase = await createClient();

    const dbEntries = Object.entries(scanResults).map(([url, result]) => ({
      organization_id: organizationId,
      url,
      verdict: result.verdict,
      score: Math.round(result.score),
      scan_results: result,
    }));

    if (dbEntries.length > 0) {
      const { error } = await supabase.from('url_scans').insert(dbEntries);
      if (error) console.error('Supabase error:', error);
    }

    return NextResponse.json(scanResults);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('URL Scan error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
