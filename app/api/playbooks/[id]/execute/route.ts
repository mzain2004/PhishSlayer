import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { executePlaybook } from '@/lib/response/playbook-executor';
import { logAudit } from '@/lib/compliance/audit-logger';
import { requirePlan } from '@/lib/billing/plan-gate';
import { apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await requirePlan(orgId, 'pro'))) {
        return apiError('UPGRADE_REQUIRED', 'Plan upgrade required', 403, { required_plan: 'pro' });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const simulation = searchParams.get('simulation') === 'true';
    const body = await req.json();

    try {
        const result = await executePlaybook(id, orgId, body.context || {}, simulation);
        
        void logAudit(orgId, {
            actor_type: 'USER',
            actor_id: userId,
            action: simulation ? 'PLAYBOOK_SIMULATED' : 'PLAYBOOK_EXECUTED',
            resource_type: 'PLAYBOOK',
            resource_id: id,
            metadata: { run_id: result.run_id, status: result.status }
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
