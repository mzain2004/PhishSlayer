# Bug Fix Workflow

Reproduce → Locate → Fix → Verify → Regression test.

## Steps

1. **Describe the symptom** — paste the full stack trace or error message. Include the request that triggered it (route, payload, agent ID if relevant).
2. **Locate** — "Find where this error originates and explain why it happens."
3. **Fix** — "Fix the issue. Don't change any other files."
4. **Verify** — "Run `npm test` / `npx vitest run` to confirm nothing else broke."
5. **Regression test** — "Write a test that would have caught this bug."

## Example prompts

```
Here's the error from production logs:
TypeError: Cannot read property 'agentId' of undefined
  at lib/agents/l1-triage.ts:87

The agent object is sometimes null when a disconnected sensor sends a late heartbeat.
Fix this so disconnected agents don't crash the triage pipeline.
```

```
The /api/connectors/wazuh endpoint is returning 500 intermittently.
Here are the recent Supabase logs: [paste logs]
Help me debug this — add logging to trace where requests fail.
Use the existing logger pattern.
```

## SOC-specific tips

- For WebSocket issues: inspect `global.connectedAgents` state; the in-process Map can diverge from Supabase `agents` table.
- For pipeline failures: run `npx vitest run lib/__tests__/pipeline.test.ts` first to isolate.
- For Python backend errors: check `phishslayer-api/` logs; FastAPI exceptions are often Pydantic v2 validation failures.
- Always check for similar null-check gaps: "Are there other places where we access `[field]` without a null check?"

## After fixing

- Commit with `fix:` prefix
- Reference the Supabase error/log timestamp in the commit body if applicable
