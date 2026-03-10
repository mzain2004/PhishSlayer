import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeCompare } from '@/lib/security/safeCompare';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export async function GET(request: Request) {
  try {
    // Auth via CRON_SECRET
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(token, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get users with digest enabled
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, notify_digest')
      .eq('notify_digest', true);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0, errors: 0, message: 'No users opted in' });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let sent = 0;
    let errors = 0;

    for (const profile of profiles) {
      try {
        // Weekly stats for this user
        const { count: totalScans } = await supabaseAdmin
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('date', sevenDaysAgo);

        const { count: maliciousCount } = await supabaseAdmin
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('verdict', 'malicious')
          .gte('date', sevenDaysAgo);

        const { count: openIncidents } = await supabaseAdmin
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'Resolved');

        const { data: topThreats } = await supabaseAdmin
          .from('scans')
          .select('target, risk_score')
          .eq('user_id', profile.id)
          .eq('verdict', 'malicious')
          .gte('date', sevenDaysAgo)
          .order('risk_score', { ascending: false })
          .limit(3);

        // Log the digest (actual email sending via Resend would go here)
        // For now, just log the event
        await supabaseAdmin.from('audit_log').insert([{
          user_id: profile.id,
          user_email: profile.email,
          user_role: 'system',
          action: 'weekly_digest_sent',
          resource_type: 'digest',
          details: {
            totalScans: totalScans || 0,
            maliciousCount: maliciousCount || 0,
            openIncidents: openIncidents || 0,
            topThreats: topThreats || [],
          },
        }]);

        sent++;
      } catch (err) {
        console.error(`Digest error for ${profile.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ sent, errors, total: profiles.length });
  } catch (err: any) {
    console.error('Weekly digest error:', err);
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 });
  }
}
