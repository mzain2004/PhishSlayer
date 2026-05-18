import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const apiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:8000';

    let resp: Response;
    try {
        resp = await fetch(`${apiUrl}/api/v1/cases/${encodeURIComponent(id)}/stix`, {
            headers: {
                'x-org-id': orgId,
                'x-user-id': userId,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }

    const body = await resp.json().catch(() => ({ error: 'Invalid response from backend' }));
    return NextResponse.json(body, { status: resp.status });
}
