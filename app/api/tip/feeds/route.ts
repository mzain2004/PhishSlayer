import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    feeds: [
      { name: 'OTX AlienVault', status: 'active', type: 'subscribed' },
      { name: 'MISP Circl.lu', status: 'active', type: 'public' },
      { name: 'Abuse.ch URLhaus', status: 'active', type: 'public' }
    ],
    lastSync: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Placeholder for adding custom feeds
  return NextResponse.json({ success: true, message: 'Feed configured', feed: body });
}
