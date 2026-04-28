import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scanEmailLeaks } from '@/lib/darkweb/leakScanner';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ScanSchema = z.object({
  emails: z.array(z.string().email()),
  domain: z.string(),
  organizationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails, domain, organizationId } = ScanSchema.parse(body);

    const scanResults = await Promise.all(emails.map(email => scanEmailLeaks(email)));
    const supabase = await createClient();

    const leakEntries: any[] = [];
    scanResults.forEach(res => {
      res.breaches.forEach(breach => {
        leakEntries.push({
          organization_id: organizationId,
          email: res.email,
          domain: domain,
          breach_source: breach.Name || breach.source || 'Unknown',
          breach_date: breach.BreachDate || null,
          exposed_data: breach.DataClasses || [],
          severity: res.severity,
          is_resolved: false
        });
      });
    });

    if (leakEntries.length > 0) {
      const { error } = await supabase.from('credential_leaks').insert(leakEntries);
      if (error) console.error('Supabase error saving leaks:', error);
    }

    return NextResponse.json({ success: true, results: scanResults });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Darkweb scan error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
