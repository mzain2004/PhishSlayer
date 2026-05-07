import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { notify } from '@/lib/notifications/dispatcher';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    try {
        await notify(orgId, {
            severity: 'info',
            event_type: 'test_notification',
            message: body.message || 'This is a test notification from PhishSlayer'
        });
        return NextResponse.json({ success: true, message: 'Test notification dispatched' });
    } catch (error: any) {
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
