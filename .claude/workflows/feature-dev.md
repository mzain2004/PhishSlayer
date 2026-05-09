# Feature Development Workflow

Explore → Plan → Implement → Test → Review → Commit.

## Steps

1. **Explore** — "How does the current [system/layer] work? Trace the request path."
2. **Plan** — "Plan how to add [feature] following existing patterns. List every file you'd change. Don't make changes yet."
3. **Implement** — Work in small increments. One logical piece at a time.
4. **Test** — "Write tests for [component]. Cover happy path, edge cases, and error conditions."
5. **Review** — "Review all the changes we made and check for bugs, security issues, and adherence to our conventions."
6. **Commit** — "Commit these changes with a `feat:` prefix message."

## PhishSlayer conventions to follow

- New API routes under `app/api/**/route.ts` must include:
  ```ts
  export const dynamic = 'force-dynamic'
  export const runtime = 'nodejs'
  ```
- All payloads validated with Zod (`zod` + `lib/zod-extensions.ts`)
- Public routes must be added to `middleware.ts` `isPublicRoute` allowlist
- Use `createClient()` from `@/lib/supabase/server` for user-scoped reads
- Use `supabaseAdmin` only in cron/WS server/webhooks — never in user-facing routes
- Auth via Clerk: `import { auth } from '@clerk/nextjs/server'`

## Example prompt sequence

```
How does the current L1 triage pipeline work? Trace a Wazuh alert from ingestion to output.
```
```
Plan how to add a confidence-score field to TriageResult. List every file you'd change.
Don't make changes yet.
```
```
Implement the plan. Start with the Pydantic model in phishslayer-api/, then the TypeScript types.
Follow the existing pattern in lib/l1/.
```
```
Write vitest tests for the new confidence-score field. Cover: valid score (0-1), score above 1,
score below 0, missing score field.
```

## Breaking features into PRs

- Each PR should do one thing
- Migrations get their own PR
- Frontend and backend changes can be bundled if tightly coupled
- Security changes always get their own PR with `security:` prefix
