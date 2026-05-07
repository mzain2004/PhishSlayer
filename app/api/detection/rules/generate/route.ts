import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateSigmaRule } from '@/lib/detection/sigma-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { huntFinding, logSample } = await req.json();
        
        if (!huntFinding || !logSample) {
            return NextResponse.json({ error: 'Missing huntFinding or logSample' }, { status: 400 });
        }

        const sigmaRule = await generateSigmaRule(huntFinding, logSample);

        if (!sigmaRule) {
            return NextResponse.json({ error: 'Failed to generate Sigma rule' }, { status: 500 });
        }

        return NextResponse.json({ sigma_yaml: sigmaRule });
    } catch (error: any) {
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
