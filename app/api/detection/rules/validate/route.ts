import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import YAML from 'yaml';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { sigma_yaml } = await req.json();
        
        if (!sigma_yaml) {
            return NextResponse.json({ error: 'Missing sigma_yaml' }, { status: 400 });
        }

        const parsed = YAML.parse(sigma_yaml);
        const requiredFields = ['title', 'id', 'status', 'description', 'logsource', 'detection', 'level'];
        const missing = requiredFields.filter(field => parsed[field] === undefined);

        if (missing.length > 0) {
            return NextResponse.json({ 
                valid: false, 
                error: `Missing required fields: ${missing.join(', ')}` 
            });
        }

        return NextResponse.json({ valid: true, parsed });
    } catch (error: any) {
        return NextResponse.json({ valid: false, error: "INTERNAL_SERVER_ERROR" });
    }
}
