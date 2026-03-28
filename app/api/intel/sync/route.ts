export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { safeCompare } from '@/lib/security/safeCompare';

export async function GET(request: NextRequest) {
  // ── CRON Secret Guard ───────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const providedToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!cronSecret || !providedToken || !safeCompare(providedToken, cronSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing CRON secret.' },
      { status: 401 }
    );
  }

  try {
    // 1. Fetch from Abuse.ch URLhaus recent urls API
    const response = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', {
      // Need a sensible revalidation or cache bypass depending on your Next.js caching setup
      cache: 'no-store',
      headers: {
        'Auth-Key': process.env.URLHAUS_AUTH_KEY || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from URLhaus: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.query_status !== 'ok' || !Array.isArray(data.urls)) {
      return NextResponse.json(
        { error: 'Invalid response format from URLhaus API.' },
        { status: 500 }
      );
    }

    const { urls } = data;

    // 2. Transform the fetched data into our proprietary_intel schema
    // Take up to 100 to avoid overloading the database in one single request
    const payloads = urls.slice(0, 100).map((item: any) => {
      // urlhaus tags severity based on threat
      let severity = 'high';
      if (item.threat === 'malware_download') {
        severity = 'critical';
      }

      return {
        indicator: item.url,
        type: 'url',
        severity,
        source: 'Abuse.ch URLhaus',
      };
    });

    if (payloads.length === 0) {
      return NextResponse.json({ message: 'No new indicators found.', added: 0 });
    }

    // 3. Upsert into Supabase proprietary_intel using the admin client (which bypasses RLS)
    // We strictly use onConflict: 'indicator' to avoid duplicates
    const { data: upsertData, error } = await supabaseAdmin
      .from('proprietary_intel')
      .upsert(payloads, { onConflict: 'indicator' })
      .select('id');

    if (error) {
      console.error('SUPABASE UPSERT ERROR:', error);
      return NextResponse.json(
        { error: 'Database upsert failed.', details: error.message },
        { status: 500 }
      );
    }

    // Returns a count of how many records were successfully processed
    return NextResponse.json({
      message: 'Indicators successfully harvested and synchronized.',
      added: upsertData?.length || payloads.length
    });

  } catch (err: any) {
    console.error('Intel Sync Error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during sync.' },
      { status: 500 }
    );
  }
}
