import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { translateSigma } from '@/lib/detection/rule-translator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { target } = await req.json();

    if (!['splunk', 'kql', 'esql'].includes(target)) {
        return NextResponse.json({ error: 'Invalid target language' }, { status: 400 });
    }

    try {
        const supabase = await createClient();
        const { data: rule, error } = await supabase
            .from('detection_rules')
            .select('sigma_yaml, rule_content')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();

        if (error || !rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

        const yaml = rule.sigma_yaml || rule.rule_content;
        const translatedQuery = await translateSigma(yaml, target as any);

        if (!translatedQuery) {
            return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
        }

        return NextResponse.json({ target, query: translatedQuery });
    } catch (error: any) {
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
