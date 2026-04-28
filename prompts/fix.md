Before starting, list every file you will create. 
Create one file at a time. After each file say "FILE DONE" then continue.
Do not stop until all files complete.

You are building features for PhishSlayer, an agentic SOC platform.
Stack: Next.js 15, TypeScript, Supabase, Clerk auth, Groq LLM.
Repo root is your working directory.

CRITICAL RULES:
- If any external API is unavailable, mock the response shape and continue
- Never stop for missing env vars — use process.env.VAR_NAME || '' pattern
- Never hallucinate npm packages — only use packages already in package.json 
  or these approved additions: node-mailparser, axios (if not present add them)
- Complete ALL tasks. If one subtask fails, skip and continue to next
- Run npm run build at the end and fix ALL TypeScript errors before finishing

BUILD TASK 1 — Email Header Analyzer:
1. Create lib/email/headerParser.ts
   - Parse raw email headers (Received chain, SPF, DKIM, DMARC, X-Originating-IP)
   - Extract: sender IP, mail path hops, authentication results, timestamp anomalies
   - Flag suspicious patterns: header injection, forged From, mismatched reply-to
   - Return structured JSON: { hops, spf, dkim, dmarc, suspiciousFlags[], riskScore }

2. Create lib/email/groqAnalyzer.ts
   - Take parsed header output + raw headers
   - Send to Groq (llama-3.3-70b-versatile) for natural language analysis
   - Return: { summary, attackVector, confidence, recommendations[] }

3. Create Supabase migration 20260428100000_email_analysis.sql:
   CREATE TABLE email_analyses (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     raw_headers TEXT,
     parsed_data JSONB,
     groq_analysis JSONB,
     risk_score INTEGER,
     flags TEXT[],
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   Enable RLS. Add org-scoped select policy.

4. Create app/api/email/analyze/route.ts
   - POST: accepts { rawHeaders: string, organizationId: string }
   - Run headerParser → groqAnalyzer → save to email_analyses
   - Return full analysis result

BUILD TASK 2 — URL Sandbox (ANY.RUN + VirusTotal fallback):
1. Create lib/sandbox/urlScanner.ts
   - Primary: VirusTotal URL scan API (POST /urls, GET /analyses/{id})
     Env: VIRUSTOTAL_API_KEY (use existing from threatIntel if present)
   - Secondary: URLScan.io free API (no key needed for basic)
     POST https://urlscan.io/api/v1/scan/ with { url, visibility: "public" }
   - Tertiary: PhishTank free lookup
     GET https://checkurl.phishtank.com/checkurl/ 
   - Run all 3 in parallel with Promise.allSettled
   - Return: { verdict, score, screenshotUrl, categories[], maliciousIndicators[] }

2. Create lib/sandbox/detonator.ts
   - Extract all URLs from email body or raw input
   - Run each through urlScanner
   - Aggregate verdict: clean/suspicious/malicious
   - Cache results in MongoDB (collection: url_sandbox_cache, TTL 24h)

3. Create Supabase migration 20260428200000_url_sandbox.sql:
   CREATE TABLE url_scans (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     url TEXT NOT NULL,
     verdict TEXT,
     score INTEGER,
     scan_results JSONB,
     scanned_at TIMESTAMPTZ DEFAULT NOW()
   );
   Enable RLS. Add org-scoped select policy.

4. Create app/api/sandbox/url/route.ts
   - POST: accepts { urls: string[], organizationId: string }
   - Run detonator → save results → return verdicts

5. Create app/api/sandbox/email/route.ts
   - POST: accepts { rawEmail: string, organizationId: string }
   - Extract URLs from email → run detonation → run header analysis
   - Return combined analysis

Run npm run build. Fix all errors. List every file created.