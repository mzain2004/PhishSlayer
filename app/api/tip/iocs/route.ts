import { NextRequest, NextResponse } from 'next/server';
import { IocModel, storeIOCs } from '@/lib/tip/iocStore';
import { connectMongo } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const confidence = searchParams.get('confidence');

    await connectMongo();
    let query = IocModel.find({});
    if (type) query = query.where('type').equals(type);
    if (confidence) query = query.where('confidence').gte(parseInt(confidence));

    const iocs = await query.sort('-lastSeen').limit(100);
    return NextResponse.json(iocs);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await storeIOCs([body]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
