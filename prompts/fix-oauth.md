You are fixing a Next.js 15 TypeScript codebase (PhishSlayer). Work step by step. Do NOT assume — search before editing. Do NOT hallucinate file paths. If a file does not exist, say so and stop.

TASK 1 — org_id rename
Run this search first: grep -rn "org_id" --include="*.ts" --include="*.tsx" src/
List every file and line number you find. Then, for each file:
- Replace every instance of org_id with organization_id in queries, filters, inserts, and TypeScript type definitions.
- Only touch tables: cases, hunt_missions, hunt_findings, ueba_profiles, ueba_anomalies, attack_paths, raw_logs, pipeline_runs, escalations.
- Do NOT rename anything in files related to Clerk, auth, or middleware.
After editing, re-run the grep to confirm zero remaining org_id references in those files.

TASK 2 — Fix 403 on /api/metrics/agent-chain
Open src/app/api/metrics/agent-chain/route.ts (find it with: find src -name "route.ts" -path "*agent-chain*").
Read the auth logic. Find where it fetches org or organization_id for the current user.
If it queries a table using org_id, fix it to organization_id.
If it uses Clerk auth() and the organizationId is null or undefined, add a guard that returns 403 with a clear JSON message: { error: "No organization context" }.

TASK 3 — Fix 401 on /api/infrastructure/wazuh-health
Open src/app/api/infrastructure/wazuh-health/route.ts.
Check if it reads process.env.WAZUH_API_KEY.
If it does not, add: const apiKey = process.env.WAZUH_API_KEY;
Ensure it is passed in the Authorization header as: Authorization: Bearer <apiKey>
If apiKey is undefined, return 401 with: { error: "WAZUH_API_KEY not configured" }

TASK 4 — Verify build
Run: npm run build
Fix every TypeScript and build error before committing. Do not commit if the build fails.

RULES:
- Search before editing. Never guess a file path.
- One task at a time. Confirm completion before moving to next.
- If you are unsure about any change, print the current code and ask before editing.
- Do not touch server.js, middleware.ts, or any Clerk config files.