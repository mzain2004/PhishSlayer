Before starting, list every file you will create. 
Create one file at a time. After each file say "FILE DONE" then continue.
Do not stop until all files complete.

You are building features for PhishSlayer, an agentic SOC platform.
Stack: Next.js 15, TypeScript, Supabase, Clerk, Groq, MongoDB Atlas.

CRITICAL RULES:
- If external APIs are rate-limited or unavailable, implement graceful fallback 
  returning empty results with { error: 'API unavailable', data: [] }
- Never stop mid-task. Skip broken subtask, log it, continue.
- No hallucinated packages. Implement manually if needed.
- npm run build at end. Zero TypeScript errors allowed.

BUILD TASK 1 — Dark Web & Credential Leak Monitoring:
1. Create lib/darkweb/leakScanner.ts
   - HaveIBeenPwned API: GET /breachedaccount/{email}
     Env: HIBP_API_KEY — use process.env.HIBP_API_KEY || ''
   - DeHashed API: POST https://api.dehashed.com/search
     Env: DEHASHED_API_KEY, DEHASHED_EMAIL
   - LeakCheck free tier: GET https://leakcheck.io/api/public?check={email}
   - Run all with Promise.allSettled, merge results
   - Return: { email, breaches[], passwordExposed, sources[], severity }

2. Create lib/darkweb/domainMonitor.ts
   - Monitor org domain for paste sites via Google Custom Search API fallback
   - Check if org emails appear in any breach
   - Use PhishTank API to check if org domain is listed

3. Create Supabase migration 20260428500000_darkweb.sql:
   CREATE TABLE credential_leaks (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     email TEXT,
     domain TEXT,
     breach_source TEXT,
     breach_date DATE,
     exposed_data TEXT[],
     severity TEXT,
     is_resolved BOOLEAN DEFAULT false,
     discovered_at TIMESTAMPTZ DEFAULT NOW()
   );
   Enable RLS. Org-scoped policies.

4. Create app/api/darkweb/scan/route.ts
   - POST { emails: string[], domain: string, organizationId: string }
   - Scan all emails → save leaks → return results

5. Create app/api/darkweb/leaks/route.ts
   - GET: return all unresolved leaks for org

6. Create app/api/cron/darkweb-scan/route.ts
   - Pull all user emails for each org, run scan, save new leaks

BUILD TASK 2 — Hunt Hypothesis Builder:
1. Create lib/hunting/hypothesisBuilder.ts
   - Input: { orgId, recentAlerts[], mitreGaps[], threatIntelFeeds[] }
   - Use Groq (llama-3.3-70b-versatile) to generate hunt hypotheses
   - Each hypothesis: { title, hypothesis, huntQuery, mitreTechnique, 
                        priority, dataSourcesNeeded[], searchPatterns[] }
   - Generate 3-5 hypotheses per call

2. Create lib/hunting/huntQuery.ts
   - Execute hunt against alerts, events tables
   - Support query types: IP-based, domain-based, user-based, behavior-based
   - Return matching events with context

3. Create Supabase migration 20260428600000_hunt_hypotheses.sql:
   CREATE TABLE hunt_hypotheses (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     title TEXT NOT NULL,
     hypothesis TEXT,
     mitre_technique TEXT,
     priority TEXT DEFAULT 'medium',
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','completed','dismissed')),
     data_sources TEXT[],
     search_patterns JSONB,
     findings_count INTEGER DEFAULT 0,
     created_by TEXT,
     ai_generated BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   Enable RLS. Org-scoped policies.

4. Create app/api/hunting/hypotheses/route.ts
   - GET: list hypotheses for org
   - POST: create manually or trigger AI generation

5. Create app/api/hunting/generate/route.ts
   - POST { organizationId }
   - Pull recent alert patterns + MITRE coverage gaps
   - Call Groq to generate hypotheses → save → return

6. Create app/api/hunting/hypotheses/[id]/execute/route.ts
   - POST: run huntQuery for this hypothesis
   - Update findings_count

BUILD TASK 3 — Vulnerability Scanner Connector:
1. Create lib/vuln/nvdScanner.ts
   - NVD API v2: search CVEs by keyword/product
   - Env: NVD_API_KEY (already in .env.production)
   - Search CVEs relevant to org's asset inventory
   - Return: { cveId, severity, cvssScore, affectedProducts[], patchAvailable }

2. Create lib/vuln/assetVulnMatcher.ts
   - Pull assets from asset inventory
   - Match CVEs to asset product/version
   - Priority queue: CRITICAL first, then HIGH
   - Return: { asset, matchedCVEs[], totalRisk }

3. Create Supabase migration 20260428700000_vulnerabilities.sql:
   CREATE TABLE vulnerabilities (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     asset_id UUID,
     cve_id TEXT,
     cvss_score NUMERIC,
     severity TEXT,
     description TEXT,
     affected_product TEXT,
     patch_available BOOLEAN DEFAULT false,
     status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','accepted')),
     discovered_at TIMESTAMPTZ DEFAULT NOW(),
     resolved_at TIMESTAMPTZ
   );
   CREATE INDEX idx_vuln_org ON vulnerabilities(organization_id);
   CREATE INDEX idx_vuln_severity ON vulnerabilities(severity);
   Enable RLS. Org-scoped policies.

4. Create app/api/vulnerabilities/route.ts
   - GET: list vulnerabilities for org (filter by severity, status)
   - POST: manually add vulnerability

5. Create app/api/vulnerabilities/scan/route.ts
   - POST { organizationId }
   - Run assetVulnMatcher → save new CVEs → return summary

6. Create app/api/cron/vuln-scan/route.ts
   - Run daily scan for all orgs

BUILD TASK 4 — Threat Intelligence Platform (TIP):
1. Create lib/tip/feedManager.ts
   - Manage multiple threat intel feeds:
     a) OTX AlienVault pulses (Env: OTX_API_KEY)
        GET https://otx.alienvault.com/api/v1/pulses/subscribed
     b) MISP feeds (open free feeds — use circl.lu free MISP)
        GET https://www.circl.lu/doc/misp/feed-osint/ (public JSON)
     c) Abuse.ch URLhaus: GET https://urlhaus-api.abuse.ch/v1/urls/recent/
     d) Abuse.ch MalwareBazaar: POST https://mb-api.abuse.ch/api/v1/ action=get_recent
   - Normalize all feeds into: { iocType, value, tags[], confidence, source, expiresAt }

2. Create lib/tip/iocStore.ts
   - Deduplicate IOCs across feeds
   - Store in MongoDB collection: threat_iocs
   - Schema: { type, value, tags, confidence, sources[], firstSeen, lastSeen, hitCount }
   - Lookup function: isKnownBad(value) → returns IOC or null

3. Create lib/tip/correlationFeed.ts
   - Cross-reference incoming alerts against TIP IOC store
   - Auto-tag alerts with matching IOCs
   - Boost alert severity if IOC confidence > 80

4. Create app/api/tip/feeds/route.ts
   - GET: list configured feeds + last sync time
   - POST: add custom feed

5. Create app/api/tip/iocs/route.ts
   - GET: query IOC store (filter by type, tag, confidence)
   - POST: manually add IOC

6. Create app/api/tip/iocs/lookup/route.ts
   - POST { value: string }
   - Check IOC store + run live enrichment
   - Return full threat context

7. Create app/api/cron/sync-tip-feeds/route.ts
   - Fetch all feeds, normalize, deduplicate, store
   - Run every 6 hours

Run npm run build. Fix every TypeScript error. List all files created.