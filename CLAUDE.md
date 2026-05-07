# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Dev server (custom server.js with WS endpoints — NOT `next dev`)
npm run dev

# Production build (Next standalone output is required for Docker)
npm run build
npm start

# Lint / tests
npm run lint
npm test                          # vitest run (jsdom)
npm run test:watch
npm run test:coverage
npx vitest run lib/__tests__/pipeline.test.ts   # single test file

# Build the Windows endpoint sensor binary
npm run build:agent               # → dist/PhishSlayerSensor.exe

# Local Python backend (FastAPI — separate process on :8000)
cd phishslayer-api && python main.py
# or: uvicorn main:app --reload --port 8000
```

Type-check uses `npx tsc --noEmit` (run by CI in `.github/workflows/deploy.yml`). The Next build alone does **not** type-check the entire project.

## Architecture

This is a **two-process** SOC platform: a Next.js 15 App Router frontend+API on **:3000** and a FastAPI Python backend on **:8000**. They communicate via `PYTHON_API_URL` (defaults to `http://localhost:8000`); see `app/api/health/route.ts` and `app/api/soc/*` for the proxy pattern.

### Custom server (`server.js`)
The dev/start command runs `node server.js`, **not** Next's built-in server. `server.js` boots Next via `next({ dev })` and adds two WebSocket endpoints on the same HTTP server:

- `ws://.../api/agent/ws` — endpoint sensors connect here. Validated with `x-agent-secret` header against `AGENT_SECRET`. Connected agents are kept in an in-process `Map` (`global.connectedAgents`) and mirrored to the `agents` Supabase table on connect/heartbeat/disconnect.
- `ws://.../api/dashboard/ws` — browser dashboard clients receive agent list + live telemetry broadcasts.

`global.agentControl` exposes `sendCommandToAgent`, `getAgentList`, `connectedAgents` to API routes. **Do not run under PM2 cluster mode** — agent state is in-process and would be sharded across workers.

### Layer map (lib/)
The `lib/` tree is the SOC engine, organised by the 12-layer model in `docs/ARCHITECTURE.md`:

- `lib/agent/` — endpoint sensor source (Windows/macOS/Linux), compiled to `dist/PhishSlayerSensor.exe`
- `lib/agents/`, `lib/l1/`, `lib/l2/`, `lib/l3/` — three-tier AI analyst pipeline (Triage → Investigate → Hunt)
- `lib/ai/`, `lib/reasoning-chain.ts` — Groq/Gemini LLM swarm
- `lib/microsoft/` — Identity-Stitching Engine (Graph/Entra/Defender → unified timeline). Core to v2's "Who → Device → Auth → Privilege → Action → Impact" sequence.
- `lib/connectors/` — pluggable SIEM/EDR/firewall/ITSM connectors (Wazuh, CrowdStrike, Elastic, ServiceNow, Jira, PagerDuty…)
- `lib/supabase/` — `server.ts` (RLS via cookies), `admin.ts` (service-role; bypasses RLS — use only in cron/webhooks/server.js), `client.ts` (browser)
- `lib/correlation/`, `lib/hunting/`, `lib/mitre/`, `lib/sigma-generator.ts`, `lib/uba/`, `lib/ueba/` — detection/correlation engines
- `lib/billing/`, `lib/quotas/`, `lib/tier-guard.ts`, `lib/rbac/` — Polar billing and tier-gated feature access
- `lib/__tests__/setup.ts` mocks `@/lib/supabase/admin` globally for vitest

### Auth & data layer (non-obvious)
- **Auth is Clerk**, not Supabase Auth. Server code: `import { auth } from '@clerk/nextjs/server'`. Webhook at `/api/webhooks/clerk` syncs users.
- **DB is Supabase Postgres** (RLS-enforced). Use `createClient()` from `@/lib/supabase/server` for user-scoped reads; `supabaseAdmin` from `@/lib/supabase/admin` only for trusted server contexts (cron/WS server/webhooks).
- `middleware.ts` runs Clerk on `/dashboard(.*)` and `/api/(.*)` with a public-route allowlist (webhooks, ingest, health). It also enforces in-memory rate limits (100/min API, 5/min auth) and adds security headers; CSP is set in `next.config.js`.

### API route conventions (enforced by GEMINI.md)
Every new route under `app/api/**/route.ts` must include:
```ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
```
All payloads validated with Zod (`zod` + `lib/zod-extensions.ts`). Public webhook/ingest/health routes are listed in `middleware.ts` `isPublicRoute`. The full surface is catalogued in `API_ROUTES_CATALOG.md` and `app/api/openapi.json`.

### Scheduled work
Cron is **system crontab on the Azure VM**, not Vercel cron. Each cron hits an internal endpoint under `app/api/cron/*` authenticated by `CRON_SECRET`. Schedule lives in `docs/CRON_SETUP.md`; entry script is `scripts/cron-runner.sh`. CI workflows `l1-triage.yml`, `l2-respond.yml`, `l3-hunt.yml` also drive these on a schedule from GitHub Actions.

### Python backend (`phishslayer-api/`)
FastAPI app at `phishslayer-api/main.py` with routers under `routers/`, Pydantic v2 models under `models/`, agent implementations under `agents/`, and the agent execution harness under `harness/`. Docker image is built from `docker/Dockerfile.api` (note: build context is the repo root, not `phishslayer-api/`). Most routers are stubs — business logic is being migrated from `app/api/*` per the comments in each router file.

### Deployment
`docker-compose.yml` runs two services (`nextjs` on 3000, `api` on 8000) using **prebuilt images from `ghcr.io/mzain2004`**. Local rebuilds are not part of compose — push via `.github/workflows/deploy.yml` which builds both images, pushes to GHCR, SSHes to the Azure VM, writes `.env.production` from secrets, and runs `docker compose pull && up -d`. The Wazuh manager (DigitalOcean, 167.172.85.62) is reconfigured in the same workflow to point its `custom-webhook` integration at `/api/connectors/wazuh`.

## Hard rules (from GEMINI.md)

- **Never modify** `server.js` or `middleware.ts` without explicit instruction — they hold the WS server, agent registry, and auth/rate-limit chain.
- **Never overwrite** `.env*` files; append only.
- Docker port mapping is always `3000:3000`. Do not change to 80.
- Product name is **PhishSlayer** (one word). Not "Phish-Slayer" in user-facing copy.
- Auth = Clerk. DB = Supabase. Don't mix them up (Supabase Auth is not used).
- Path alias `@/*` resolves to repo root (see `tsconfig.json` and `vitest.config.ts`).
