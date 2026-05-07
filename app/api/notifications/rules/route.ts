import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('notification_rules')
        .insert({
            org_id: orgId,
            name: body.name,
            channel_id: body.channel_id,
            trigger_conditions: body.trigger_conditions || {},
            cooldown_minutes: body.cooldown_minutes || 0,
            is_active: true
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
