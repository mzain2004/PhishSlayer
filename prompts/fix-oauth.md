You are fixing a Next.js 15 TypeScript codebase called PhishSlayer. 
Work ONE task at a time. Search before editing. Never guess file paths. 
If a file does not exist, say so and stop. Confirm each task completion before moving on.

---

TASK 1 — Fix org_id rename (causes 400 errors on Supabase queries)

First run this exact command and show me the full output:
grep -rn "org_id" --include="*.ts" --include="*.tsx" src/

List every file and line number found. Then for each file:
- Replace every instance of org_id with organization_id in queries, filters, inserts, and TypeScript type definitions
- Only touch these tables: cases, hunt_missions, hunt_findings, ueba_profiles, ueba_anomalies, attack_paths, raw_logs, pipeline_runs, escalations, audit_logs
- Do NOT rename anything in Clerk auth files or middleware.ts

After editing, re-run the grep and confirm zero remaining org_id references in those files.

---

TASK 2 — Fix 403 on /api/metrics/agent-chain

Run: find src -name "route.ts" -path "*agent-chain*"
Open that file. Read the full auth logic.
Find where it fetches organizationId for the current user.
If it queries any table using org_id, fix to organization_id.
If auth() returns null organizationId, add this guard at the top of the handler:
  if (!organizationId) return NextResponse.json({ error: 'No organization context' }, { status: 403 })
The route is being called in a polling loop — make sure it does not throw unhandled errors.

---

TASK 3 — Fix 401 on /api/infrastructure/wazuh-health

Run: find src -name "route.ts" -path "*wazuh-health*"
Open that file. Check if it reads process.env.WAZUH_API_KEY.
If missing, add: const apiKey = process.env.WAZUH_API_KEY
Ensure it passes the key as: Authorization: Bearer ${apiKey}
If apiKey is undefined or empty, return immediately:
  return NextResponse.json({ error: 'WAZUH_API_KEY not configured', status: 'unconfigured' }, { status: 200 })
IMPORTANT: Return 200 with a status field instead of 401 so the dashboard does not show an error when key is simply not set yet.

---

TASK 4 — Fix Supabase refresh_token_not_found spam

Run: find src -name "*.ts" -name "*.tsx" | xargs grep -l "supabase" | grep -v node_modules
Find all places where a Supabase client is created server-side.
Check if any route or component is calling supabase.auth.getSession() or supabase.auth.refreshSession() in a polling loop or repeated server component render.
If found, wrap the call in a try/catch that silently ignores refresh_token_not_found errors:
  catch (error) {
    if (error?.code === 'refresh_token_not_found') return null
    throw error
  }
Do NOT delete sessions from the database.

---

TASK 5 — Fix WebhookVerificationError on /api/webhooks/clerk

Run: find src -name "route.ts" -path "*webhooks/clerk*"
Open that file. Find where it reads the webhook secret.
Confirm it reads: process.env.CLERK_WEBHOOK_SECRET
Do NOT hardcode any value. Just confirm the env var name is exactly CLERK_WEBHOOK_SECRET with no typos.
If the variable name is different, rename it to CLERK_WEBHOOK_SECRET.
This error means the secret in the container does not match Clerk dashboard — that is an ops fix, not a code fix. Just confirm the code is reading the right variable and report back.

---

TASK 6 — Build check

Run: npm run build
Fix every TypeScript and build error before committing.
Do not commit if build fails.
Show me the final build output.

---

RULES:
- Search before editing. Never guess a file path.
- One task at a time. Confirm completion before moving to next.
- Do not touch server.js, middleware.ts, or any Clerk config files.
- If unsure about any change, print the current code and ask before editing.