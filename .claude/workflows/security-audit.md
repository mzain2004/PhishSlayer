# Security Audit Workflow

Use before merging security-sensitive changes or on a regular cadence.

## Quick audit (staged changes)

```bash
git diff --staged | claude -p "Audit these changes for security issues. \
Check for: secrets in code, SQL injection, XSS, missing auth checks, \
over-permissioned Supabase queries (supabaseAdmin where createClient should be used), \
missing Zod validation, new public routes not added to middleware.ts allowlist."
```

## Full branch audit

```bash
git diff main...HEAD | claude -p "Security review of this branch. \
Flag any OWASP Top 10 issues, exposed secrets, auth bypasses, or RLS violations."
```

## PhishSlayer security checklist

Before any PR:
- [ ] No secrets, tokens, or credentials in committed files
- [ ] `.env*` covered by `.gitignore` and `.claudeignore`
- [ ] New API routes include Zod validation on all inputs
- [ ] New public routes added to `middleware.ts` `isPublicRoute`
- [ ] `supabaseAdmin` NOT used in user-scoped routes (only cron/WS/webhooks)
- [ ] New Supabase tables have RLS policies
- [ ] `server.js` and `middleware.ts` NOT modified (unless explicitly required)
- [ ] No Docker port mapping changed from `3000:3000`
- [ ] Ingest routes include `INGEST_API_KEY` verification

## Targeted security prompts

```
Review lib/microsoft/ for any place where we build Graph API queries
without sanitizing user-controlled input.
```

```
Check all routes under app/api/connectors/ — verify each one requires
authentication and validates its payload with Zod.
```

```
Scan phishslayer-api/routers/ for any endpoint that accepts user input
without Pydantic model validation.
```
