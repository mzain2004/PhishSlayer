import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generatePermutations } from '@/lib/osint/typosquat';
import { checkNewCerts } from '@/lib/osint/ct-monitor';
import { checkDomainRegistration } from '@/lib/osint/domain-monitor';
import { scanGitHub } from '@/lib/osint/github-scanner';
import { checkWhoisChanges } from '@/lib/osint/whois-monitor';
import { deliverWebhook } from '@/lib/webhooks/delivery';
import { verifyCronAuth, unauthorizedResponse } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetOrgId = body.organization_id;

    // 2. Fetch all Organizations and their Brand Assets
    let query = supabaseAdmin.from('organizations').select('id, name');
    if (targetOrgId) {
      query = query.eq('id', targetOrgId);
    }
    
    const { data: orgs, error: orgError } = await query;

    if (orgError) throw orgError;

    for (const org of orgs) {
      const { data: assets, error: assetError } = await supabaseAdmin
        .from('brand_assets')
        .select('*')
        .eq('organization_id', org.id);

      if (assetError) continue;

      for (const asset of assets) {
        const domain = asset.domain;
        const brandName = asset.brand_name;

        // A. Generate Permutations
        const permutations = generatePermutations(domain);

        // B. Check CT Logs
        const certs = await checkNewCerts(domain, permutations);
        for (const cert of certs) {
           const finding = {
             organization_id: org.id,
             type: 'brand_impersonation',
             severity: 'MEDIUM',
             source: 'CT_LOG',
             details: cert
           };
           await supabaseAdmin.from('osint_findings').insert(finding);
           if (finding.severity === 'HIGH') {
             void deliverWebhook(org.id, 'osint.finding', finding);
           }
        }

        // C. Check Domain Registration
        const domains = await checkDomainRegistration(permutations);
        for (const d of domains) {
          if (d.is_registered) {
            const finding = {
              organization_id: org.id,
              type: 'brand_impersonation',
              severity: d.severity as 'LOW' | 'MEDIUM' | 'HIGH',
              source: 'DOMAIN_REG',
              details: d
            };
            await supabaseAdmin.from('osint_findings').insert(finding);
            if (finding.severity === 'HIGH') {
              void deliverWebhook(org.id, 'osint.finding', finding);
            }
          }
        }

        // D. Scan GitHub
        const leaks = await scanGitHub(brandName, [domain]);
        for (const leak of leaks) {
          const finding = {
            organization_id: org.id,
            type: 'credential_leak',
            severity: leak.severity as 'LOW' | 'MEDIUM' | 'HIGH',
            source: 'GITHUB',
            details: leak
          };
          await supabaseAdmin.from('osint_findings').insert(finding);
          if (finding.severity === 'HIGH') {
            void deliverWebhook(org.id, 'osint.finding', finding);
          }
        }

        // E. Check WHOIS Changes
        const { data: lastWhois } = await supabaseAdmin
          .from('osint_findings')
          .select('details')
          .eq('organization_id', org.id)
          .eq('source', 'WHOIS')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const whoisChanges = await checkWhoisChanges(domain, lastWhois?.details);
        if (whoisChanges.length > 0) {
          await supabaseAdmin.from('osint_findings').insert({
            organization_id: org.id,
            type: 'whois_change',
            severity: 'HIGH',
            source: 'WHOIS',
            details: { domain, changes: whoisChanges }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'OSINT brand scan completed' });
  } catch (error: any) {
    console.error('OSINT CRON Error:', error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
