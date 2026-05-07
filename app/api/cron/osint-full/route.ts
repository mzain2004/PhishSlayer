import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { monitorPasteSites } from '@/lib/osint/paste-monitor';
import { checkCredentialLeaks } from '@/lib/osint/credential-monitor';
import { checkEmailPosture } from '@/lib/osint/email-posture';
import { mapInfrastructure } from '@/lib/osint/infra-footprint';
import { trackVulnerabilities } from '@/lib/osint/vuln-intelligence';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!verifyCronAuth(req)) {
        return unauthorizedResponse();
    }

    try {
        const { data: orgs } = await supabaseAdmin.from('organizations').select('id, name');
        if (!orgs) return NextResponse.json({ success: true, message: 'No organizations found' });

        for (const org of orgs) {
            const { data: brandAssets } = await supabaseAdmin
                .from('brand_assets')
                .select('domain, brand_name')
                .eq('organization_id', org.id);

            const domains = brandAssets?.map(a => a.domain) || [];
            const brandNames = brandAssets?.map(a => a.brand_name) || [org.name];

            // Run Agents
            for (const domain of domains) {
                await monitorPasteSites(org.id, [domain, ...brandNames]);
                await checkCredentialLeaks(org.id, domain);
                await checkEmailPosture(org.id, domain);
            }

            await mapInfrastructure(org.id, org.name);
            await trackVulnerabilities(org.id);

            // Create alerts for CRITICAL findings in this run
            const { data: criticalFindings } = await supabaseAdmin
                .from('osint_findings')
                .select('*')
                .eq('organization_id', org.id)
                .eq('severity', 'CRITICAL')
                .eq('resolved', false)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

            if (criticalFindings && criticalFindings.length > 0) {
                for (const finding of criticalFindings) {
                    const { error: alertError } = await supabaseAdmin.from('alerts').insert({
                        organization_id: org.id,
                        title: `CRITICAL OSINT Finding: ${finding.type}`,
                        description: `Source: ${finding.source}. Details: ${JSON.stringify(finding.details)}`,
                        severity: 'CRITICAL',
                        status: 'open',
                        source: 'OSINT_SUITE',
                        payload: finding
                    });
                    
                    if (alertError) {
                        console.error('Failed to create alert for OSINT finding', alertError);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Full OSINT suite execution completed' });
    } catch (error: any) {
        console.error('OSINT Full Suite Error:', error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return POST(req);
}
