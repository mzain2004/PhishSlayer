## Context (carry forward)
- Project: PhishSlayer — Next.js 15, Supabase, Clerk, Groq, Docker on Azure
- Repo: D:\Phish Slayer (mzain2004/Phish-Slayer on GitHub)
- Audit found 32 issues — 6 CRITICAL, 10 HIGH must be fixed before next deploy
- MCP connectors available: Supabase, GitHub, Clerk — USE THEM for all DB and repo operations
- NEVER modify server.js beyond what is explicitly instructed
- NEVER overwrite .env files — append only
- ALWAYS run npm run build before declaring any feature complete
- Docker port is always 3000:3000, env file is always .env.production

---

## YOUR ROLE
You are a senior security engineer fixing critical vulnerabilities in a production Next.js 15 
security platform. Fix ONLY what is listed. Do not refactor, rename, or improve anything else.
After EACH fix output: ✅ [C1/C2/etc] [filename:line] — Fixed: [one line description]

---

## PHASE 1 — CRITICAL FIXES (do in exact order)

### C6 FIRST — Fix .dockerignore (prevents secrets entering build context)

Read `.dockerignore`. Find the line `!.env.production` and delete it.
The file should EXCLUDE all .env files. .env.production must NEVER be copied into Docker build.
Correct .dockerignore should contain:
.env
.env.local
.env.production
.env*.local
Save the file.
✅ Confirm: `!.env.production` line is gone.

---

### C1 — Fix deploy.yml hardcoded API keys

Read `.github/workflows/deploy.yml`.
Find lines ~209-210 containing:
  `INGEST_API_KEY=ps_ingest_2026_phishslayer`
  `PHISH_SLAYER_API_KEY=ps_main_2026_phishslayer`

Replace BOTH hardcoded values with GitHub Secrets references:
  `INGEST_API_KEY=${{ secrets.INGEST_API_KEY }}`
  `PHISH_SLAYER_API_KEY=${{ secrets.PHISH_SLAYER_API_KEY }}`

Then use the GitHub MCP connector to add these secrets to the repo:
  - Secret name: `INGEST_API_KEY` → value: `ps_ingest_2026_phishslayer`
  - Secret name: `PHISH_SLAYER_API_KEY` → value: `ps_main_2026_phishslayer`
  
Also scan deploy.yml for ANY other hardcoded values that look like keys/tokens/passwords.
Move every one to GitHub Secrets using the same pattern.
✅ Confirm: zero hardcoded secret values remain in deploy.yml.

---

### C2 — Remove AGENT_SECRET from server.js stdout

Read `server.js`. Find line ~76 where it logs the AGENT_SECRET value.
Delete ONLY that console.log/console.warn line. Touch nothing else in server.js.
✅ Confirm: AGENT_SECRET value is never printed to stdout.

---

### C5 — Fix ingest webhook auth (no-op → real verification)

Read `app/api/ingest/webhook/route.ts`.
Find line ~17 with the comment admitting the API key is never verified.

Replace the no-op with real verification:
```typescript
// At the TOP of the POST handler, before any processing:
const ingestKey = request.headers.get('x-api-key') ?? 
                  request.headers.get('authorization')?.replace('Bearer ', '')

if (!ingestKey || ingestKey !== process.env.INGEST_API_KEY) {
  return NextResponse.json(
    { error: 'UNAUTHORIZED' },
    { status: 401 }
  )
}
```

Verify `INGEST_API_KEY` is in `.env.production`. If missing, append:
INGEST_API_KEY=ps_ingest_2026_phishslayer
✅ Confirm: unauthenticated requests to /api/ingest/webhook return 401.

---

### C4 — Add Clerk auth to all 15 unauthenticated routes

Run this scan first:
```bash
grep -rn "export async function" app/api/ --include="*.ts" -l | xargs grep -L "auth()"
```

For EVERY file returned, add Clerk authentication at the top of each handler:
```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  // existing code continues...
}
```

Apply this pattern to ALL of these known unprotected routes:
- app/api/sandbox/url/route.ts
- app/api/sandbox/email/route.ts  
- app/api/soc/l1/route.ts
- app/api/soc/pipeline/route.ts
- app/api/vulnerabilities/route.ts
- ALL other routes returned by the grep scan above

EXCEPTION: Do NOT add Clerk auth to:
- app/api/webhooks/wazuh/route.ts (uses HMAC)
- app/api/webhooks/polar/route.ts (uses Polar signature)
- app/api/ingest/webhook/route.ts (uses API key — just fixed in C5)

After adding auth, also add org-scoping to every DB query in those files:
- Every `supabase.from('table').select()` must have `.eq('org_id', orgId)`
- Every INSERT must include `org_id: orgId` in the data object

✅ Confirm: zero routes (except webhooks) accessible without valid Clerk session.

---

### C3 — Add auth to dashboard WebSocket

Read `app/api/dashboard/ws/route.ts`.
The WebSocket currently accepts ALL connections with zero auth.

Add token validation at connection time:
```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  // Validate before upgrading to WebSocket
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Scope all WebSocket messages to this orgId only
  // Store orgId in connection context
  // Filter all broadcast events: only send events where event.orgId === orgId
  
  // existing WebSocket upgrade code...
}
```

Ensure WebSocket messages are filtered by orgId — no cross-tenant data can leak.
✅ Confirm: WebSocket returns 401 without valid Clerk session.

---

## PHASE 2 — HIGH FIXES

### H1 — Fix all error.message leaks (80+ occurrences)

Run scan:
```bash
grep -rn "error\.message\|err\.message\|\.stack" app/api/ --include="*.ts"
```

For EVERY occurrence where error.message appears in a Response or NextResponse:

Replace:
```typescript
// WRONG — leaks internal details
return NextResponse.json({ error: error.message }, { status: 500 })
return NextResponse.json({ message: err.message }, { status: 500 })
```

With:
```typescript
// CORRECT — sanitized
console.error('[ROUTE_NAME]', error) // keep server-side logging
return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
```

Known critical locations — fix these first:
- `app/api/cron/l2-respond/route.ts` line ~664
- `app/api/cron/l2-respond/route.ts` line ~726

Then fix ALL remaining occurrences from the grep output.
✅ Confirm: zero error.message values in any API response body.

---

### H2 — Add POLAR_WEBHOOK_SECRET to .env.production

Read `.env.production`. Check if `POLAR_WEBHOOK_SECRET` exists.
If MISSING, append this line:
POLAR_WEBHOOK_SECRET=REPLACE_WITH_ACTUAL_VALUE_FROM_POLAR_DASHBOARD

Then read `app/api/webhooks/polar/route.ts`.
Verify the webhook validates the Polar signature using this secret.
If signature validation is missing, add:
```typescript
import { validateEvent } from '@polar-sh/nextjs'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-polar-signature') ?? ''
  
  try {
    const event = validateEvent(
      body,
      signature,
      process.env.POLAR_WEBHOOK_SECRET!
    )
    // process event...
  } catch (error) {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 403 })
  }
}
```
✅ Confirm: Polar webhook validates signature before processing.

---

### H3 — Fix Wazuh webhook HMAC validation

Read `app/api/webhooks/wazuh/route.ts`.
Verify HMAC validation is present and actually executed (not commented out).

If missing or commented out, add:
```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function validateWazuhSignature(body: string, signature: string): boolean {
  const expected = createHmac('sha256', process.env.WAZUH_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  const expectedBuf = Buffer.from(`sha256=${expected}`)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return timingSafeEqual(expectedBuf, signatureBuf)
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''
  
  if (!validateWazuhSignature(body, signature)) {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 401 })
  }
  // existing processing...
}
```

Append to `.env.production` if missing:
WAZUH_WEBHOOK_SECRET=REPLACE_WITH_ACTUAL_WAZUH_WEBHOOK_SECRET
✅ Confirm: unsigned Wazuh webhooks rejected with 401.

---

## PHASE 3 — DATABASE FIXES (use Supabase MCP connector)

### DB1 — Apply critical security migration

Use the Supabase MCP connector to:

1. First READ the migration file:
   `supabase/migrations/20260427000001_critical_security_fixes.sql`
   
2. Check if it has been applied:
   Query via Supabase MCP: 
   `SELECT * FROM supabase_migrations.schema_migrations WHERE version = '20260427000001'`

3. If NOT applied — execute the full migration via Supabase MCP.

4. After applying, verify via Supabase MCP that RLS is enabled on all tables:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations','alerts','agent_reasoning','soc_metrics',
                  'static_analysis','ioc_store','intelligence_documents',
                  'document_chunks','capabilities','agent_evolution',
                  'consequence_predictions','decepticon_findings');
```
Any table showing `rowsecurity = false` = CRITICAL. Enable RLS:
```sql
ALTER TABLE [tablename] ENABLE ROW LEVEL SECURITY;
```

### DB2 — Verify RLS policies exist

Via Supabase MCP, check policies:
```sql
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

For ANY table missing SELECT/INSERT/UPDATE policies, create them:
```sql
-- Template for org-scoped policy
CREATE POLICY "org_isolation_select" ON [tablename]
  FOR SELECT USING (org_id = (
    SELECT org_id FROM organizations 
    WHERE clerk_org_id = auth.jwt() ->> 'org_id'
  ));

CREATE POLICY "org_isolation_insert" ON [tablename]
  FOR INSERT WITH CHECK (org_id = (
    SELECT org_id FROM organizations 
    WHERE clerk_org_id = auth.jwt() ->> 'org_id'
  ));
```

### DB3 — Add decepticon_findings table

Via Supabase MCP, create the table if it doesn't exist:
```sql
CREATE TABLE IF NOT EXISTS decepticon_findings (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attack_name       text NOT NULL,
    agent_level       text CHECK (agent_level IN ('l1','l2','l3')),
    attack_vector     text NOT NULL,
    payload_summary   text,
    defense_passed    boolean NOT NULL,
    resistance_score  float4,
    details           jsonb,
    run_date          timestamptz DEFAULT now()
);
-- No RLS — red team table, internal only, no org_id
-- No public access policy
REVOKE ALL ON decepticon_findings FROM anon, authenticated;
GRANT ALL ON decepticon_findings TO service_role;
```

### DB4 — Add missing indexes

Via Supabase MCP, add indexes for common query patterns:
```sql
-- Alerts queried by org + status constantly
CREATE INDEX IF NOT EXISTS idx_alerts_org_status 
  ON alerts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_org_severity 
  ON alerts(org_id, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created 
  ON alerts(created_at DESC);

-- Agent reasoning queried by alert_id
CREATE INDEX IF NOT EXISTS idx_agent_reasoning_alert 
  ON agent_reasoning(alert_id);
CREATE INDEX IF NOT EXISTS idx_agent_reasoning_org 
  ON agent_reasoning(org_id);

-- IOC store queried by value  
CREATE INDEX IF NOT EXISTS idx_ioc_store_value 
  ON ioc_store(org_id, ioc_type, value);

-- Capabilities queried by org + active
CREATE INDEX IF NOT EXISTS idx_capabilities_org_active 
  ON capabilities(org_id, active);
```

---

## PHASE 4 — FORCE-DYNAMIC AUDIT

Run:
```bash
grep -rn "export async function" app/api/ --include="*.ts" -l | xargs grep -L "force-dynamic"
```

For EVERY file returned, add at the TOP of the file (before imports if possible, else after):
```typescript
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
```

✅ Confirm: every API route has both exports.

---

## PHASE 5 — VALIDATION

After ALL fixes are applied:

1. Run build:
```bash
npm run build
```
Fix any TypeScript errors introduced. Do NOT ignore them.

2. Run security re-scan:
```bash
# Confirm no error.message in responses
grep -rn "error\.message" app/api/ | grep -v "console\|logger\|\/\/"

# Confirm no hardcoded secrets
grep -rn "ps_ingest\|ps_main_2026\|AKIAR" --include="*.ts" --include="*.yml" .

# Confirm all routes have auth
grep -rn "export async function" app/api/ --include="*.ts" -l | xargs grep -L "auth()" | grep -v "webhooks"
```

3. ALL three scans must return ZERO results.

4. Via Supabase MCP — verify RLS one final time:
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
```
Must return zero rows.

---

## FINAL REPORT FORMAT

After completing all phases, output:
PhishSlayer Security Fix Report
Date: [today]
Fixes Applied
✅ C6 - .dockerignore: !.env.production removed
✅ C1 - deploy.yml: API keys moved to GitHub Secrets
✅ C2 - server.js:76: AGENT_SECRET log removed
✅ C5 - ingest/webhook: real API key verification added
✅ C4 - [N] routes: Clerk auth added to all [list them]
✅ C3 - dashboard/ws: WebSocket auth + org scoping added
✅ H1 - [N] error.message leaks fixed
✅ H2 - POLAR_WEBHOOK_SECRET: added + signature validation
✅ H3 - Wazuh webhook: HMAC validation added
✅ DB1 - Critical migration: applied
✅ DB2 - RLS policies: verified/added on all tables
✅ DB3 - decepticon_findings table: created
✅ DB4 - Indexes: added
Build Status
npm run build: [PASS/FAIL + any errors]
Remaining Issues
[List anything that needs manual action — e.g. actual secret values to set in Polar dashboard]
Manual Actions Required

Set POLAR_WEBHOOK_SECRET in .env.production with actual value from polar.sh dashboard
Set WAZUH_WEBHOOK_SECRET in .env.production with actual value from Wazuh config
Redeploy Docker container: docker compose down && docker compose up -d --build


---

## STOP CONDITIONS — stop and ask before doing these:
- Deleting any table or column in Supabase
- Modifying middleware.ts beyond adding auth patterns
- Changing any Clerk organization settings
- Rotating or changing any API key values (only move them, never change them)
- Any change to server.js beyond removing the one console.log line