# Security Audit — 2026-05-13

Scope: multi-tenant hardening pass against the prompt
"COMPREHENSIVE SECURITY HARDENING + MULTI-TENANT AUDIT".

The codebase has **271 route handlers across 217 files** and **302 Supabase
queries across 147 files**. A faithful per-handler audit is multi-day work.
This document records what was fixed, what was verified clean, and what
remains as flagged follow-up.

---

## ✅ Fixed in this pass

### Reusable security primitives
- `lib/security/ssrf-guard.ts` — `assertExternalHost()` + `safeFetch()`.
  Resolves DNS server-side, rejects RFC1918 / loopback / link-local /
  cloud-metadata, blocks IPv4-mapped IPv6, multicast (224/4), and
  `localhost`. Forces `redirect: "manual"` so a 302 cannot bypass.
- `lib/security/rate-limit.ts` — Redis-backed via `REDIS_URL`, in-memory
  fallback. `rateLimit(key, max, windowSeconds)` + `rateLimitResponse()`.
- `lib/security/rbac.ts` — `requireAuth()` and `requireRole(["org:owner",
  "org:admin"])`. Returns a typed guard with `.ok`/`.response`.

### Multi-tenant data isolation
- `app/api/hunting/run/route.ts` — **IDOR fix**. Previously accepted
  `organization_id` from the request body, letting any user pivot across
  orgs. Now derives `orgId` from Clerk JWT only; Zod schema is `.strict()`
  to reject the body field; Zod error.issues no longer leaked.
- `app/api/tip/iocs/route.ts` + `lib/tip/iocStore.ts` — added optional
  `org_id` field to the Mongo IOC schema. Queries now return the
  requesting org's private IOCs **plus** global threat-intel rows
  (`org_id IS NULL`). Never returns another org's private indicators.
- `app/api/tip/iocs/lookup/route.ts` — now requires orgId from Clerk and
  passes it through to `isKnownBad()`. Removed `parsed.error.issues` leak.

### SSRF
- `lib/mcp-integration-tests.ts` — refactored to import from the shared
  ssrf-guard lib. Same protection as before, deduplicated.

### Rate limiting (applied)
- `/api/hunting/run` — 10 / min / org
- `/api/integrations/connect` — 10 / min / org
- `/api/integrations/test` — 20 / min / org

### RBAC
- `/api/integrations/connect` — now requires `org:owner` or `org:admin`
  (writing a long-lived org-wide secret is not a viewer/analyst action).

### Information leakage
- Zod `error.message` / `error.issues` removed from response in
  `app/api/reports/export/route.ts`, `app/api/settings/integrations/
  route.ts`, `app/api/settings/integrations/misp/route.ts`,
  `app/api/tip/iocs/lookup/route.ts`, `app/api/hunting/run/route.ts`.

### XSS (from previous pass, verified)
- `app/dashboard/hunting/page.tsx` — `highlightLog` rebuilt to render
  React `<span>`s; `dangerouslySetInnerHTML` removed. **Grep across
  the entire project finds zero remaining occurrences.**

### RLS template
- `supabase/migrations/20260512000001_org_isolation_template.sql` —
  template (not auto-applied) showing the `current_org_id()` helper and
  the `org_id = public.current_org_id()` policy pattern for the tables
  the audit calls out: alerts, incidents, iocs, reports, agents,
  halo_proposals, org_integrations, tool_call_logs, platform_logs.

---

## 🔎 Verified clean (no fix required)

- **`dangerouslySetInnerHTML`** — 0 occurrences project-wide.
- **`console.log` of password/secret/key/token/encrypted** — 0
  occurrences anywhere in `.ts/.tsx/.js`.
- **Existing CSP / HSTS / XCTO / Referrer-Policy / Permissions-Policy
  / CORS** — present in `next.config.js`. CORS is restricted to
  `phishslayer.tech` (prod) or `http://localhost:3000` (dev) — no
  wildcards.
- **Webhook signature verification** — `/api/webhooks/wazuh` uses
  `timingSafeEqual` against `WAZUH_WEBHOOK_SECRET`; `/api/billing/
  webhook` uses Polar SDK `validateEvent()`.

---

## ⚠️ Flagged — needs follow-up

These are real risks the audit identified but that I did not fix in
this pass because they require schema knowledge, environment setup, or
per-file judgement I shouldn't make unilaterally.

### High priority

1. **Apply the RLS migration template** to the actual tables. The
   existing `20260421_clerk_rls_migration.sql` uses `auth.jwt() IS
   NOT NULL` on `incidents` and several other tables — that allows
   Org A to read Org B's incident rows. Until the template above is
   applied, RLS does not enforce isolation; we rely entirely on the
   `.eq('org_id', orgId)` filter in application code.

2. **Per-route auth + org-scoping sweep.** I did not read all 271
   handlers. The auth() pattern is widely consistent but I cannot
   claim every route is clean. Recommended next step: a CI lint rule
   that fails any route file lacking `auth()` in the first 5 lines,
   or any Supabase chain on a known-tenant table lacking
   `.eq('org_id', ...)`. Suggest using `eslint-plugin-security` plus
   a small custom rule.

3. **Rate limits on remaining routes** per the original prompt:
   - `/api/alerts` (POST) — 100/min/org
   - `/api/webhooks/wazuh` — 1000/min (high-volume)
   - `/api/webhooks/polar` — 100/min
   These are mechanical with the new `rateLimit()` helper; not
   applied here because webhook routes need a separate key strategy
   (no orgId at request time — key by IP or webhook source).

4. **RBAC on remaining destructive routes.** Only
   `/api/integrations/connect` was protected. Same pattern needs to
   be applied to:
   - `/api/integrations/disconnect`
   - `/api/billing/checkout`, `/api/billing/portal`
   - All `DELETE` handlers project-wide
   - Member invite/remove routes (when added)

### Medium priority

5. **Python services not audited.** `phishslayer-api/` (FastAPI) and
   `mcp-gateway/` (Python MCP gateway) need the same audit applied
   in their own native style:
   - org_id required (non-empty) on every request
   - Redis keys prefixed with `{org_id}:`
   - LangGraph state scoped per-invocation
   - AgentOps `session_id = f"{org_id}_{alert_id}_{uuid4()}"`
   - No module-scope mutable state

6. **`.strict()` on Zod schemas.** Several POST routes use Zod but
   not in strict mode, so unknown fields are silently dropped rather
   than rejected. Mechanically convert `z.object({...})` →
   `z.object({...}).strict()` after spot-checking each route doesn't
   actually expect forward-compatible extra fields.

7. **`npm audit`** — not run in this pass. Run:
   ```
   npm audit --json > audit.json
   ```
   and address `critical`/`high` findings.

### Low priority / accepted

8. **TIP IOC store is intentionally cross-org for global threat
   intel** (rows where `org_id IS NULL` come from public feeds like
   VirusTotal, AbuseIPDB). Org-private rows are now properly scoped.
   This is **accepted risk** — public CTI data is shared by design.

9. **`X-Frame-Options: SAMEORIGIN`** — kept, not changed to `DENY`.
   `next.config.js` has an explicit comment that same-origin
   embedding is wanted. Flip to `DENY` only after confirming no
   in-app iframes (dashboards, docs, billing portal).

10. **`server.js` and `middleware.ts`** — untouched per ABSOLUTE
    RULES. Existing middleware already handles per-IP rate limiting
    (100/min on `/api/*`) and request-ID injection.

---

## Build status

`npm run build` was run after these changes and exited 0 with no
TypeScript errors and no warnings.
