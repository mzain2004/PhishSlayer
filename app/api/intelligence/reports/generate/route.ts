import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GenerateSchema = z.object({
    caseId: z.string().min(1).max(200),
    reportType: z.enum(['tactical', 'operational', 'strategic']).default('tactical'),
});

export async function POST(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let rawBody: unknown;
    try {
        rawBody = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parse = GenerateSchema.safeParse(rawBody);
    if (!parse.success) {
        return NextResponse.json(
            { error: 'Invalid request', issues: parse.error.issues.map(i => i.message) },
            { status: 422 }
        );
    }

    const { caseId, reportType } = parse.data;
    const apiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:8000';

    let resp: Response;
    try {
        resp = await fetch(`${apiUrl}/api/v1/reports/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: orgId, case_id: caseId, report_type: reportType }),
        });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }

    const body = await resp.json().catch(() => ({ error: 'Invalid response from backend' }));
    return NextResponse.json(body, { status: resp.status });
}
