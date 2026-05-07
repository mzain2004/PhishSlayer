import { NextRequest, NextResponse } from 'next/server';
import { pullAbuseCH } from '@/lib/intel/feeds/abuse-ch';
import { pullCISAKEV } from '@/lib/intel/feeds/cisa-kev';
import { pullNVD } from '@/lib/intel/feeds/nvd';
import { runConfidenceDecay } from '@/lib/intel/decay';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    // Simple check - only authenticated users can trigger seed for now
    // In production, we'd check for an admin role
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.info('Manual CTI Seed Triggered...');
        
        await Promise.allSettled([
            pullAbuseCH(),
            pullCISAKEV(),
            pullNVD()
        ]);

        await runConfidenceDecay();

        return NextResponse.json({ success: true, message: 'CTI seeding completed' });
    } catch (error: any) {
        console.error('CTI Seed Error:', error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
