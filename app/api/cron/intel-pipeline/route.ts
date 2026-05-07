import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runIntelPipeline } from '@/lib/detection/intel-pipeline';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!verifyCronAuth(req)) {
        return unauthorizedResponse();
    }

    try {
        console.info('Starting Intel-Driven Detection Pipeline...');
        
        const { data: orgs } = await supabaseAdmin.from('organizations').select('id');
        if (orgs) {
            for (const org of orgs) {
                await runIntelPipeline(org.id);
            }
        }

        return NextResponse.json({ success: true, message: 'Intel pipeline executed successfully' });
    } catch (error: any) {
        console.error('Intel Pipeline CRON Error:', error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return POST(req);
}
