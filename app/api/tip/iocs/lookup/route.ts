import { NextRequest, NextResponse } from 'next/server';
import { isKnownBad } from '@/lib/tip/iocStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { value } = await req.json();
    const ioc = await isKnownBad(value);
    
    // Live enrichment (placeholder - would call VirusTotal, OTX, etc. live)
    const enrichment = {
      vt_score: 0,
      otx_pulse_count: 0
    };

    return NextResponse.json({
      value,
      isKnownBad: !!ioc,
      details: ioc,
      enrichment
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
