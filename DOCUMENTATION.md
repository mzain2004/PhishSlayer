# Phish-Slayer — Autonomous SOC Intelligence Platform

## Complete Technical & User Documentation

### 1. PRODUCT OVERVIEW

Phish-Slayer is an autonomous SOC intelligence platform implemented as a Next.js 15 application with API-driven agent workflows, Supabase-backed persistence, Gemini 2.5 Flash reasoning, and Wazuh integration.

What it solves:

- Traditional SOC operations are alert-volume-centric and force analysts to pivot across disconnected tools.
- Phish-Slayer focuses on identity continuity and automated triage/response loops, reducing manual investigation load.

Target users:

- MSSPs
- SOC teams
- Enterprise security operations

Core value proposition vs traditional SOC tooling:

- Autonomous L1/L2/L3 workflow orchestration through API and scheduled jobs.
- Built-in action actuators (identity isolation and IP blocking).
- Unified reasoning-chain persistence in `agent_reasoning` for explainability/export.
- Integrated detection engineering outputs (`sigma_rules`, `ctem_exposures`).
- Real-time endpoint telemetry streaming from agent sockets to dashboard sockets.

Current platform status and live URL:

- Build status in this audit: successful (`npm run build`, exit code 0).
- CI/CD target URL in workflows: `https://phishslayer.tech`.
- Internal runtime URL in deployment workflows: `http://localhost:3000`.

### 2. ARCHITECTURE OVERVIEW

```mermaid
flowchart LR
  subgraph EDR[Wazuh + Endpoint Agents]
    WA[Wazuh Manager 4.9.2]
    EA[Endpoint Agents over WS /api/agent/ws]
  end

  subgraph API[Next.js 15 API Layer]
    C1[/api/connectors/wazuh]
    C2[/api/agent/triage]
    C3[/api/cron/l1-triage]
    C4[/api/cron/l2-respond]
    C5[/api/cron/l3-hunt]
    C6[/api/actions/block-ip]
    C7[/api/actions/isolate-identity]
    C8[/api/detection/sigma]
    C9[/api/detection/ctem]
    C10[/api/platform/training-data]
  end

  subgraph AI[AI Engine]
    O1[Ollama local model]
    G1[Gemini 2.5 Flash]
    F1[generateWithFallback]
  end

  subgraph DB[Supabase]
    T1[(alerts)]
    T2[(escalations)]
    T3[(agent_reasoning)]
    T4[(static_analysis)]
    T5[(sigma_rules)]
    T6[(ctem_exposures)]
    T7[(audit_logs)]
    T8[(soc_metrics)]
    T9[(agent_circuit_breakers)]
  end

  subgraph UI[Frontend Dashboard]
    D1[/dashboard]
    D2[/dashboard/threats]
    D3[/dashboard/escalations]
    D4[/dashboard/agents]
    D5[/api/dashboard/ws]
  end

  WA --> C1 --> T1
  C3 --> C2 --> T1
  C2 -->|close/escalate| T2
  C4 --> C6
  C4 --> C7
  C4 --> C8
  C5 --> T9
  C5 --> C9
  C2 --> F1
  C4 --> F1
  C8 --> F1
  F1 --> O1
  F1 --> G1
  C2 --> T3
  C4 --> T3
  C5 --> T3
  C9 --> T6
  C8 --> T5
  C10 --> T3
  C6 --> T7
  C7 --> T7
  EA --> D5 --> D4
  T8 --> D1
  T2 --> D3
  T1 --> D2
```

Component breakdown:

- Frontend:
  - Next.js app router pages under `app/` and dashboard pages under `app/dashboard/*`.
  - Key dashboard widgets in `components/dashboard/*` and SOC panels in `components/soc/*`.
- Backend:
  - API routes in `app/api/**/route.ts`.
  - Custom server and dual WebSocket channels in `server.js` (`/api/agent/ws`, `/api/dashboard/ws`).
- AI Engine:
  - Fallback orchestration in `lib/ollama-client.ts` (`generateWithFallback`).
  - Agent prompts and reasoning persistence in `lib/reasoning-chain.ts`.
  - Detection generation in `lib/sigma-generator.ts`.
- EDR:
  - Wazuh connector ingestion endpoint `app/api/connectors/wazuh/route.ts`.
  - Wazuh token/API client in `lib/wazuh-client.ts`.
- Infrastructure:
  - Deployment and cron orchestration in `.github/workflows/*.yml`.
  - Health checks in `app/api/infrastructure/wazuh-health/route.ts` and `app/api/infrastructure/ollama-health/route.ts`.

Data flow (Wazuh alert -> webhook -> L1/L2/L3 -> actuator hands):

1. Wazuh posts alert JSON to `/api/connectors/wazuh`.
2. Route normalizes and inserts into `alerts`.
3. L1 scheduler (`/api/cron/l1-triage`) invokes `/api/agent/triage` and writes triage decisions; escalates where needed.
4. L2 scheduler (`/api/cron/l2-respond`) consumes `escalations` and decides auto-action (`BLOCK_IP` or `ISOLATE_IDENTITY`) vs human review.
5. L3 scheduler (`/api/cron/l3-hunt`) runs reader/hunter/reviewer sequence; reviewer can throttle/halt via `agent_circuit_breakers`.
6. Actuator hands execute through `/api/actions/block-ip` and `/api/actions/isolate-identity`.

WebSocket real-time pipeline:

- Agent-side socket: `/api/agent/ws` (registered in `server.js`).
- Dashboard-side socket: `/api/dashboard/ws` (registered in `server.js`, consumed in `lib/hooks/useAgentWebSocket.ts`).
- Telemetry messages (`mitigation_log`, `fim_event`, `process_event`, `network_event`) are broadcast to dashboard clients.

Tech stack with versions:

- Next.js `^15.1.0` (build observed 15.5.13)
- React `^19.0.0`
- TypeScript `5.9.3`
- Supabase JS `^2.98.0`
- Gemini SDK `@google/genai ^1.43.0`
- Wazuh integration through custom HTTPS client + webhook route
- Node `20` in CI workflows

### 3. FEATURES — DETAILED BREAKDOWN

#### 3-Gate URL Scanner (VirusTotal -> WHOIS/Intel -> Gemini)

- What it does:
  - Scans URL/domain/IP through a tiered gate pipeline and returns verdict/risk.
- How it works internally:
  - Entry route: `app/api/v1/scan/route.ts` (`handleScan`).
  - Gate 1: whitelist (`whitelist`).
  - Gate 2: proprietary intel (`proprietary_intel`).
  - Gate 3: external scan (`scanTarget` in `lib/scanners/threatScanner.ts`) and AI scoring (`scoreCtiFinding` in `lib/ai/analyzer.ts`).
  - Tier-0 prevention policy call: `runTier0Prevention` in `lib/prevention/tier0Engine.ts`.
- Files powering it:
  - `app/api/v1/scan/route.ts`
  - `lib/scanners/threatScanner.ts`
  - `lib/ai/analyzer.ts`
  - `lib/prevention/tier0Engine.ts`
  - `lib/security/sanitize.ts`
- API routes:
  - `GET/POST /api/v1/scan`
- Supabase tables:
  - `profiles`, `whitelist`, `proprietary_intel`, `scans`, `audit_logs`

#### L1 Agent (triage)

- What it does:
  - Performs autonomous initial triage: close vs escalate.
- How it works internally:
  - Scheduler: `app/api/cron/l1-triage/route.ts` (`GET`).
  - Worker: `app/api/agent/triage/route.ts`.
  - Structured decision schema with confidence and recommended action.
  - Persists reasoning through `saveReasoningChain`.
- Files:
  - `app/api/cron/l1-triage/route.ts`
  - `app/api/agent/triage/route.ts`
  - `lib/reasoning-chain.ts`
- API routes:
  - `GET /api/cron/l1-triage`
  - `GET/POST /api/agent/triage`
- Tables:
  - `alerts`, `scans`, `escalations`, `agent_reasoning`, `audit_logs`

#### L2 Agent (investigation)

- What it does:
  - Reviews pending escalations and chooses automated response vs manual review.
- How it works internally:
  - Scheduler route: `app/api/cron/l2-respond/route.ts`.
  - Decision model prompt (`L2_PROMPT`) + `generateWithFallback`.
  - Internal action invocations to block IP or isolate identity.
- Files:
  - `app/api/cron/l2-respond/route.ts`
  - `lib/reasoning-chain.ts`
  - `lib/ollama-client.ts`
- API routes:
  - `GET /api/cron/l2-respond`
  - Calls `/api/actions/block-ip`, `/api/actions/isolate-identity`, `/api/actions/escalate`, `/api/detection/sigma`
- Tables:
  - `escalations`, `agent_reasoning`, `audit_logs`

#### L3 Agent (response + actuator hands)

- What it does:
  - Runs threat hunting pipeline and reviewer/circuit-breaker decisions.
- How it works internally:
  - Scheduler route: `app/api/cron/l3-hunt/route.ts`.
  - Sequence: `/api/agent/hunter/reader` -> `/api/agent/hunter/hunt` -> `/api/agent/hunter/review`.
  - Reviewer can emit `CONTINUE`, `THROTTLE`, `HALT`.
- Files:
  - `app/api/cron/l3-hunt/route.ts`
  - `app/api/agent/hunter/reader/route.ts`
  - `app/api/agent/hunter/hunt/route.ts`
  - `app/api/agent/hunter/review/route.ts`
- API routes:
  - `GET /api/cron/l3-hunt`
- Tables:
  - `threat_intel`, `scans`, `escalations`, `agent_circuit_breakers`, `audit_logs`, `agent_reasoning`, `static_analysis`

#### Reasoning Chain Engine (agent_reasoning table, audit docs)

- What it does:
  - Stores explainable decisions for L1/L2/L3 and exports for training.
- Internal:
  - `saveReasoningChain` in `lib/reasoning-chain.ts`.
  - Prompt builders: `buildL1ReasoningPrompt`, `buildL2ReasoningPrompt`, `buildL3ReasoningPrompt`.
- Files:
  - `lib/reasoning-chain.ts`
  - `app/api/reasoning/route.ts`
  - `app/api/platform/training-data/route.ts`
- Routes:
  - `GET /api/reasoning`
  - `GET /api/platform/training-data`
- Tables:
  - `agent_reasoning`, `audit_logs`

#### Static Analysis Agent (entropy, strings, MITRE mapping)

- What it does:
  - Performs static file analysis for malware indicators.
- Internal:
  - `calculateEntropy`, `mapEntropyRisk`, `extractSuspiciousStrings`, `checkVirusTotal`.
  - MITRE mapping via `mapToMitre`.
- Files:
  - `lib/static-analysis.ts`
  - `lib/mitre-mapper.ts`
  - `app/api/analysis/static/route.ts`
- Routes:
  - `POST/GET /api/analysis/static`
- Tables:
  - `static_analysis`, `alerts`

#### Detection Engineering (Sigma rule generator, CTEM exposures)

- What it does:
  - Generates Sigma detections and tracks CTEM exposure records.
- Internal:
  - Sigma: `generateSigmaRule`, `generateWithGemini` in `lib/sigma-generator.ts`.
  - CTEM API stores/queries exposures.
- Files:
  - `lib/sigma-generator.ts`
  - `app/api/detection/sigma/route.ts`
  - `app/api/detection/ctem/route.ts`
- Routes:
  - `POST/GET /api/detection/sigma`
  - `POST/GET /api/detection/ctem`
- Tables:
  - `sigma_rules`, `ctem_exposures`, `agent_reasoning`

#### Multi-Tenant Platform (organizations, members, connectors)

- What it does:
  - Manages organizations, memberships, and connector records.
- Internal:
  - Schema and RLS policies in `20260411_multi_tenant.sql`.
- Files:
  - `supabase/migrations/20260411_multi_tenant.sql`
  - `app/api/platform/organizations/route.ts`
  - `app/api/platform/connectors/route.ts`
- Routes:
  - `GET/POST /api/platform/organizations`
  - `GET/POST /api/platform/connectors`
- Tables:
  - `organizations`, `organization_members`, `connectors`

#### SOC Metrics Dashboard (MTTD, MTTR, false positive rate)

- What it does:
  - Aggregates SOC operational KPIs.
- Internal:
  - `calculateDailyMetrics`, `getMetricsSummary` in `lib/soc-metrics.ts`.
- Files:
  - `lib/soc-metrics.ts`
  - `app/api/metrics/route.ts`
  - `app/api/platform/metrics/route.ts`
  - `app/dashboard/mttr/page.tsx`
- Routes:
  - `GET/POST /api/metrics`
  - `GET/POST /api/platform/metrics`
- Tables:
  - `soc_metrics`, `alerts`, `escalations`, `agent_reasoning`

#### Ollama + Gemini fallback architecture

- What it does:
  - Uses local model first and cloud fallback for resilience.
- Internal:
  - `generateWithFallback` in `lib/ollama-client.ts`.
- Files:
  - `lib/ollama-client.ts`
  - callers: `app/api/cron/l2-respond/route.ts`, `lib/sigma-generator.ts`
- Routes:
  - Indirect via L2 and sigma generation routes.
- Tables:
  - Not direct (callers persist decisions in `agent_reasoning`/`sigma_rules`).

#### Identity Isolator actuator

- What it does:
  - Locks profile, revokes sessions, applies long-duration auth ban.
- Internal:
  - Route validates admin role or internal AGENT_SECRET.
  - Uses Supabase auth admin APIs.
- Files:
  - `app/api/actions/isolate-identity/route.ts`
- Routes:
  - `POST /api/actions/isolate-identity`
- Tables:
  - `profiles`, `audit_logs`

#### IP Blocker via Cloudflare WAF actuator

- What it does:
  - Blocks source IP through Cloudflare firewall/access rules and records action.
- Internal:
  - Cloudflare API calls in route.
- Files:
  - `app/api/actions/block-ip/route.ts`
- Routes:
  - `POST /api/actions/block-ip`
- Tables:
  - `blocked_ips`, `audit_logs`, `profiles` (caller role check)

#### Discord Escalation Webhook actuator

- What it does:
  - Sends incident/automation alerts to Discord.
- Internal:
  - Implemented in scan paths and CI workflows.
- Files:
  - `lib/supabase/actions.ts` (`fireDiscordAlert`)
  - `app/api/v1/scan/route.ts`
  - `.github/workflows/*.yml` failure/success notifications
- Routes:
  - Indirect; no dedicated Discord route.
- Tables:
  - Not direct.

#### Wazuh EDR integration and webhook pipeline

- What it does:
  - Receives Wazuh alerts and triggers triage.
- Internal:
  - Ingestion route normalizes payload and inserts into `alerts`.
- Files:
  - `app/api/connectors/wazuh/route.ts`
  - `lib/wazuh-client.ts`
- Routes:
  - `POST /api/connectors/wazuh`
  - `GET /api/infrastructure/wazuh-health`
- Tables:
  - `alerts`, `infrastructure_health`

#### Microsoft Graph + Entra identity chain analysis

- What it does:
  - Builds identity chains from sign-in + privilege events.
- Internal:
  - Graph client auth via Azure credentials.
  - Chain assembly in `buildIdentityChain`.
- Files:
  - `lib/microsoft/graphClient.ts`
  - `lib/microsoft/signInIngestion.ts`
  - `lib/microsoft/privilegeTracking.ts`
  - `lib/microsoft/chainBuilder.ts`
  - `app/api/v2/identity/*/route.ts`
- Routes:
  - `GET /api/v2/identity/chain`
  - `GET /api/v2/identity/timeline`
  - `GET /api/v2/identity/actors`
  - `GET /api/v2/identity/anomalies`
  - `GET /api/v2/identity/lifecycle`
  - `GET /api/v2/identity/report`
  - `GET /api/v2/identity/signins`
- Tables:
  - not found in codebase for identity persistence tables (computed on request from Graph).

#### Circuit breaker system (agent_circuit_breakers)

- What it does:
  - Protects against runaway L3 escalation storms.
- Internal:
  - L3 reviewer compares escalations/hour and can insert halted status.
- Files:
  - `app/api/agent/hunter/review/route.ts`
- Routes:
  - `GET /api/agent/hunter/review`
- Tables:
  - `agent_circuit_breakers`, `escalations`, `audit_logs`

#### Audit logging system

- What it does:
  - Stores security and operational audit events.
- Internal:
  - `logAuditEvent` in `lib/audit/auditLogger.ts` and `lib/security/audit.ts`.
  - Widespread inserts from action and agent routes.
- Files:
  - `lib/audit/auditLogger.ts`
  - `lib/security/audit.ts`
  - many `app/api/*` routes
- Routes:
  - `GET /dashboard/audit` page consumes logs.
- Tables:
  - `audit_logs`

#### Real-time WebSocket EDR feed

- What it does:
  - Streams endpoint agent status and telemetry to dashboard clients.
- Internal:
  - Custom Node server in `server.js` with two `WebSocketServer` instances.
  - Client hook in `lib/hooks/useAgentWebSocket.ts`.
- Files:
  - `server.js`
  - `lib/hooks/useAgentWebSocket.ts`
  - `lib/agent/endpointMonitor.ts`
- Routes:
  - WS endpoint `/api/agent/ws`
  - WS endpoint `/api/dashboard/ws`
- Tables:
  - `agents` for online/offline heartbeat sync

#### Infrastructure health monitoring

- What it does:
  - Checks health of Wazuh/Ollama integrations and writes records.
- Files:
  - `app/api/infrastructure/wazuh-health/route.ts`
  - `app/api/infrastructure/ollama-health/route.ts`
  - `app/api/infrastructure/update-wazuh-config/route.ts`
- Routes:
  - `GET /api/infrastructure/wazuh-health`
  - `GET /api/infrastructure/ollama-health`
  - `POST /api/infrastructure/update-wazuh-config`
- Tables:
  - `infrastructure_health`, `audit_logs`

#### Training data exporter (JSONL for fine-tuning)

- What it does:
  - Exports reasoning rows as JSONL prompt/completion pairs.
- Files:
  - `app/api/platform/training-data/route.ts`
- Routes:
  - `GET /api/platform/training-data`
- Tables:
  - `agent_reasoning`

### 4. SUPABASE DATABASE SCHEMA

Source of truth note:

- Exact SQL schema found only for: `agent_reasoning`, `static_analysis`, `organizations`, `organization_members`, `connectors`, `soc_metrics`.
- Remaining requested tables: full DDL not found in codebase. Columns/types below are inferred from read/write code paths only.

#### `alerts`

- Columns/types (inferred):
  - `id` uuid
  - `status` text
  - `source` text
  - `rule_level` integer
  - `rule_id` text
  - `rule_description` text
  - `rule_groups` text[]
  - `agent_id` text
  - `agent_name` text
  - `agent_ip` text
  - `src_ip` text
  - `dest_ip` text
  - `process_name` text
  - `process_id` text
  - `file_path` text
  - `file_hash_sha256` text
  - `mitre_technique_id` text
  - `mitre_tactic` text
  - `full_payload` jsonb
  - `created_at` timestamptz
  - `reviewed_by` uuid/text
  - `reviewed_at` timestamptz
- Purpose: normalized Wazuh and alert queue records.
- RLS policies: not found in codebase.
- Relationships (inferred):
  - referenced by `agent_reasoning.alert_id`
  - referenced by `static_analysis.alert_id`
  - referenced by `sigma_rules.alert_id`

#### `escalations`

- Columns/types (inferred):
  - `id` uuid
  - `alert_id` uuid/text
  - `severity` text
  - `title` text
  - `description` text
  - `affected_user_id` uuid
  - `affected_ip` text
  - `recommended_action` text
  - `telemetry_snapshot` jsonb
  - `discord_notified` boolean
  - `status` text
  - `resolved_by` text
  - `resolved_at` timestamptz
  - `created_at` timestamptz
- Purpose: L1/L2/L3 handoff queue.
- RLS: not found in codebase.
- Relationships:
  - referenced by `agent_reasoning.escalation_id`

#### `blocked_ips`

- Columns/types (inferred from insert):
  - `id` uuid
  - `ip` text
  - `reason` text
  - `threat_level` text
  - `blocked_by` uuid
  - `cloudflare_rule_id` text
  - `created_at` timestamptz
- Purpose: persistent log of network-level blocks.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `enrolled_agents`

- Columns/types (inferred):
  - `id` uuid
  - `user_id` uuid
  - `hostname` text
  - `platform` text
  - `status` text
  - `enrolled_at` timestamptz
- Purpose: endpoint enrollment registry.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `infrastructure_health`

- Columns/types (inferred):
  - `id` uuid
  - `component` text
  - `status` text
  - `details` jsonb/text
  - `created_at` timestamptz
- Purpose: health snapshots for infrastructure checks.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `threat_intel`

- Columns/types (inferred):
  - `id` uuid
  - `indicator` text
  - `indicator_type` text
  - `source` text
  - `confidence` numeric
  - `created_at` timestamptz
- Purpose: IOC storage for hunt/reader steps.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `agent_circuit_breakers`

- Columns/types (inferred):
  - `id` uuid
  - `agent` text
  - `status` text
  - `reason` text
  - `halted_at` timestamptz
- Purpose: store halted/throttled state from L3 reviewer.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `audit_logs`

- Columns/types (inferred):
  - `id` uuid
  - `actor_id` uuid
  - `target_id` uuid/text
  - `action` text
  - `severity` text
  - `reason` text
  - `metadata` jsonb
  - `created_at` timestamptz
- Purpose: security and operations event trail.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `agent_reasoning` (exact SQL found)

- Columns/types:
  - `id` uuid pk
  - `alert_id` uuid fk -> `alerts(id)`
  - `escalation_id` uuid fk -> `escalations(id)`
  - `agent_level` text check (`L1`,`L2`,`L3`)
  - `decision` text
  - `confidence_score` float
  - `reasoning_text` text
  - `iocs_considered` jsonb default `[]`
  - `actions_taken` jsonb default `[]`
  - `model_used` text default `gemini-2.5-flash`
  - `execution_time_ms` integer
  - `created_at` timestamptz default now()
- Purpose: explainability and training corpus.
- RLS:
  - enabled
  - policy: `Service role full access`
- Relationships:
  - fk to `alerts`, `escalations`

#### `static_analysis` (exact SQL found)

- Columns/types:
  - `id` uuid pk
  - `alert_id` uuid fk -> `alerts(id)`
  - file/hash/entropy/string/VT/PE/MITRE/report fields (see migration)
  - `risk_score` integer check 0..100
  - `verdict` text check (`clean`,`suspicious`,`malicious`,`unknown`)
  - `analysis_duration_ms` integer
  - `created_at` timestamptz
- Purpose: malware static analysis persistence.
- RLS:
  - enabled
  - policy: `Service role full access`
- Relationships:
  - fk to `alerts`

#### `sigma_rules`

- Columns/types (inferred from insert/select):
  - `id` uuid
  - `alert_id` uuid
  - `analysis_id` uuid
  - `rule_name` text
  - `rule_title` text
  - `rule_description` text
  - `rule_status` text
  - `rule_level` text
  - `rule_yaml` text
  - `mitre_techniques` jsonb/text[]
  - `auto_deployed` boolean
  - `deployment_target` text
  - `created_at` timestamptz
- Purpose: generated detection rules.
- RLS: not found in codebase.
- Relationships:
  - links to `alerts`, `static_analysis` inferred.

#### `ctem_exposures`

- Columns/types (inferred):
  - `id` uuid
  - exposure metadata fields (asset, vector, severity, score, status) inferred
  - `created_at` timestamptz
- Purpose: exposure management records.
- RLS: not found in codebase.
- Relationships: not found in codebase.

#### `organizations` (exact SQL found)

- Columns/types:
  - `id` uuid pk
  - `name` text
  - `slug` text unique
  - `plan` text check (`trial`,`starter`,`pro`,`enterprise`,`mssp`)
  - `max_agents` integer
  - `max_alerts_per_day` integer
  - `is_active` boolean
  - `owner_id` uuid fk -> `auth.users(id)`
  - `created_at` timestamptz
- Purpose: tenant root entity.
- RLS:
  - enabled
  - policy: `Service role full access`
- Relationships:
  - parent of `organization_members`, `connectors`, `soc_metrics`

#### `organization_members` (exact SQL found)

- Columns/types:
  - `id` uuid pk
  - `organization_id` uuid fk -> `organizations(id)`
  - `user_id` uuid fk -> `auth.users(id)`
  - `role` text check (`owner`,`admin`,`analyst`,`viewer`)
  - `created_at` timestamptz
  - unique `(organization_id, user_id)`
- Purpose: tenant membership and role mapping.
- RLS:
  - enabled
  - policy: `Service role full access`
- Relationships:
  - child of `organizations`

#### `connectors` (exact SQL found)

- Columns/types:
  - `id` uuid pk
  - `organization_id` uuid fk -> `organizations(id)`
  - `connector_type` text check (wazuh, splunk, crowdstrike, sentinelone, microsoft_defender, elastic, custom)
  - `connector_name` text
  - `config` jsonb
  - `is_active` boolean
  - `last_ping` timestamptz
  - `created_at` timestamptz
- Purpose: external connector registry/config.
- RLS:
  - enabled
  - policy: `Service role full access`
- Relationships:
  - child of `organizations`

#### `soc_metrics` (exact SQL found)

- Columns/types:
  - `id` uuid pk
  - `organization_id` uuid fk -> `organizations(id)`
  - `metric_date` date
  - `total_alerts`, `alerts_closed`, `alerts_escalated` integer
  - `mean_time_to_detect_ms`, `mean_time_to_respond_ms` bigint
  - `false_positive_rate` float
  - `l1_processed`, `l2_processed`, `l3_hunts` integer
  - `sigma_rules_generated`, `ips_blocked`, `identities_isolated` integer
  - `created_at` timestamptz
  - unique `(organization_id, metric_date)`
- Purpose: SOC KPI timeseries.
- RLS:
  - enabled
  - policy: `Service role full access`
- Relationships:
  - child of `organizations`

### 5. API ROUTES REFERENCE

All route files audited under `app/api/**/route.ts`.

| Method   | Path                                    | Purpose                                      | Request payload                                     | Response schema                                                   | Auth                                                | Called by                    |
| -------- | --------------------------------------- | -------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| POST     | /api/actions/block-ip                   | Cloudflare IP block actuator + persist event | `{ ip: string, reason: string, threatLevel: 'low    | medium                                                            | high                                                | critical' }`                 | `{ success, ip, cloudflare_blocked, cloudflare_rule_id, audit_logged }` | AGENT_SECRET or signed-in admin/manager/super_admin | L2 responder, manual actions |
| POST     | /api/actions/escalate                   | Create escalation record                     | alert/severity/action payload                       | success/error JSON                                                | AGENT_SECRET or authenticated privileged user       | L1/L2/L3 routes              |
| POST     | /api/actions/escalate/[id]/approve      | Approve escalation                           | path id                                             | success/error JSON                                                | authenticated privileged                            | dashboard escalation actions |
| POST     | /api/actions/escalate/[id]/dismiss      | Dismiss escalation                           | path id                                             | success/error JSON                                                | authenticated privileged                            | dashboard escalation actions |
| POST     | /api/actions/isolate-identity           | Identity isolation kill chain                | `{ targetUserId: uuid, reason: string }`            | `{ success, message, kill_chain }`                                | AGENT_SECRET or signed-in admin/manager/super_admin | L2 responder, manual actions |
| POST     | /api/actions/tier0-check                | Tier0 policy check and possible block        | IOC/scan payload                                    | success/error JSON                                                | authenticated/agent context                         | scan workflows               |
| POST     | /api/agent/commands                     | Issue command to endpoint agent              | command payload                                     | success/error JSON                                                | authenticated role + profile check                  | dashboard agent console      |
| GET      | /api/agent/download                     | Download endpoint installer                  | none                                                | binary/script response                                            | authenticated                                       | dashboard agents             |
| GET,POST | /api/agent/hunt                         | Hunt orchestration endpoint                  | hunt params (POST)                                  | hunt result JSON                                                  | authenticated/cron context                          | dashboard + internal         |
| GET      | /api/agent/hunter/hunt                  | L3 hunter pass                               | none                                                | `{ success, iocs_processed, hits_found, escalations_created... }` | CRON_SECRET                                         | /api/cron/l3-hunt            |
| GET      | /api/agent/hunter/reader                | IOC ingest pass                              | none                                                | `{ success, total_iocs, inserted... }`                            | CRON_SECRET                                         | /api/cron/l3-hunt            |
| GET      | /api/agent/hunter/review                | Circuit breaker review pass                  | none                                                | `{ success, verdict, recommended... }`                            | CRON_SECRET                                         | /api/cron/l3-hunt            |
| GET      | /api/agent/list                         | List connected agents                        | none                                                | agent list JSON                                                   | authenticated                                       | dashboard agent view         |
| GET,POST | /api/agent/respond                      | Agent response operations                    | action payload                                      | success/error JSON                                                | authenticated/internal                              | internal agent flow          |
| GET,POST | /api/agent/triage                       | L1 triage engine                             | optional trigger payload                            | summary + per-item decisions                                      | CRON_SECRET or privileged role depending call path  | /api/cron/l1-triage          |
| POST,GET | /api/analysis/static                    | Static file analysis                         | POST: file/hash/alert context                       | analysis record JSON                                              | auth/cron depending caller                          | L3 + manual analysis         |
| POST     | /api/billing/cancel                     | Cancel subscription                          | optional reason payload                             | success/error JSON                                                | authenticated                                       | billing page                 |
| GET,POST | /api/billing/portal                     | Create billing portal session                | none                                                | redirect/session JSON                                             | authenticated                                       | billing page                 |
| POST     | /api/communications                     | Waitlist/communications handlers             | validated comm payload                              | success/error JSON                                                | public/validated                                    | landing/contact flows        |
| POST     | /api/connectors/wazuh                   | Wazuh webhook ingestion                      | Wazuh alert JSON                                    | success/error JSON                                                | WAZUH_WEBHOOK_SECRET                                | Wazuh manager                |
| GET      | /api/cron/l1-triage                     | Run scheduled L1 triage                      | none                                                | triage summary JSON                                               | CRON_SECRET                                         | GitHub Action hourly         |
| GET      | /api/cron/l2-respond                    | Run scheduled L2 responder                   | none                                                | responder summary JSON                                            | CRON_SECRET                                         | GitHub Action 15-min         |
| GET      | /api/cron/l3-hunt                       | Run scheduled L3 swarm                       | none                                                | reader/hunter/reviewer summary                                    | CRON_SECRET                                         | GitHub Action 6-hour         |
| GET      | /api/deep-scan                          | Deep scan retrieval trigger                  | query params                                        | scan intelligence JSON                                            | authenticated                                       | dashboard threats            |
| POST,GET | /api/detection/ctem                     | CTEM exposure write/read                     | POST: exposure payload; GET: query params           | exposure JSON/list                                                | service/auth context                                | detection pipeline           |
| POST,GET | /api/detection/sigma                    | Sigma generation/list                        | POST `{ alert_id, analysis_id? }`; GET list filters | generated/listed sigma rules                                      | service/auth context                                | L2 and detection UI          |
| GET      | /api/digest/weekly                      | Generate weekly digest                       | none                                                | digest summary JSON                                               | authenticated/cron                                  | digest workflow              |
| POST     | /api/flag-ioc                           | IOC flag and intel updates                   | IOC payload                                         | success/error JSON                                                | internal/auth                                       | ingestion/intel workflows    |
| POST     | /api/infrastructure/enroll-agent        | Enroll endpoint agent                        | enrollment payload                                  | success/enrollment JSON                                           | authenticated privileged                            | dashboard agents             |
| GET      | /api/infrastructure/ollama-health       | Ollama health status                         | none                                                | status JSON                                                       | auth/cron                                           | infra monitor                |
| POST     | /api/infrastructure/update-wazuh-config | Update Wazuh config remotely                 | config payload                                      | success/error JSON                                                | authenticated privileged                            | infra admin                  |
| GET      | /api/infrastructure/wazuh-health        | Wazuh health probe                           | none                                                | detailed health JSON                                              | CRON_SECRET or privileged                           | workflow + dashboard         |
| GET      | /api/intel/sync                         | Threat intel sync trigger                    | none                                                | sync summary JSON                                                 | CRON_SECRET/auth                                    | intel jobs                   |
| GET,POST | /api/metrics                            | Read/calc SOC metrics                        | POST optional org payload                           | metrics summary JSON                                              | GET open/auth context; POST CRON_SECRET             | dashboard + jobs             |
| GET,POST | /api/platform/connectors                | Manage connectors                            | POST connector payload; GET optional org_id         | connector or list JSON                                            | service/auth context                                | platform admin               |
| GET,POST | /api/platform/metrics                   | Platform metrics (daily rollup)              | POST optional org payload                           | metrics JSON                                                      | POST requires CRON_SECRET                           | daily metrics workflow       |
| GET,POST | /api/platform/organizations             | Manage organizations                         | POST org payload                                    | org/list JSON                                                     | service/auth context                                | platform admin               |
| GET      | /api/platform/training-data             | Export JSONL training data                   | query `summary=true                                 | false`                                                            | JSON summary or JSONL stream                        | CRON_SECRET/x-cron-secret    | training exports                                                        |
| GET      | /api/reasoning                          | Reasoning chain retrieval                    | query filters                                       | reasoning list JSON                                               | auth/service context                                | dashboard/audit/export       |
| POST     | /api/recon/port-patrol                  | Recon/port patrol action                     | recon payload                                       | recon findings JSON                                               | auth/internal                                       | threats dashboard            |
| POST     | /api/siem/push                          | Push findings to SIEM format                 | alert payload                                       | success/error JSON                                                | auth/internal                                       | detection pipeline           |
| POST     | /api/support                            | Support ticket create                        | support form payload                                | success/error JSON                                                | authenticated                                       | dashboard support            |
| POST     | /api/support-chat                       | Chat support backend                         | chat message payload                                | answer JSON                                                       | authenticated/public with limits                    | support widget               |
| POST     | /api/threat/ai-analysis                 | AI threat analysis endpoint                  | threat context payload                              | AI assessment JSON                                                | auth/internal                                       | dashboard/scans              |
| GET,POST | /api/v1/scan                            | Public scanner API v1                        | GET query `target`, POST `{ target }`               | `{ success, data }` or error                                      | `x-api-key` + tier checks                           | external API users           |
| GET      | /api/v2/identity/actors                 | Identity actors summary                      | query `hours`                                       | actors JSON                                                       | authenticated                                       | identity dashboard           |
| GET      | /api/v2/identity/anomalies              | Identity anomaly list                        | query `hours`                                       | anomalies JSON                                                    | authenticated                                       | identity dashboard           |
| GET      | /api/v2/identity/chain                  | Identity chain graph                         | query `hours`                                       | `{ chains, nonHumanActors, summary }`                             | authenticated                                       | identity dashboard           |
| GET      | /api/v2/identity/lifecycle              | Non-human lifecycle events                   | query params                                        | lifecycle JSON                                                    | authenticated                                       | identity dashboard           |
| GET      | /api/v2/identity/report                 | Identity PDF/report payload                  | query params                                        | report JSON/file                                                  | authenticated                                       | MTTR/reporting               |
| GET      | /api/v2/identity/signins                | Raw sign-in events                           | query `hours`                                       | sign-ins JSON                                                     | authenticated                                       | identity dashboard           |
| GET      | /api/v2/identity/timeline               | Timeline + MTTR                              | query `hours`                                       | `{ timeline, mttr, anomalyCounts, summary }`                      | authenticated                                       | MTTR dashboard               |
| POST     | /api/waitlist                           | Waitlist signup                              | validated waitlist payload                          | success/error JSON                                                | public/validated                                    | landing page                 |

### 6. GITHUB ACTIONS WORKFLOWS

Requested names vs repository names:

- `l1-agent.yml` not found in codebase.
- `l2-agent.yml` not found in codebase.
- `l3-agent.yml` not found in codebase.
- Repository uses `l1-triage.yml`, `l2-respond.yml`, `l3-hunt.yml`.

#### deploy.yml

- Trigger:
  - `push` on `main`
  - `workflow_dispatch`.
- What it does:
  - Node setup + `npm ci` + `npx tsc --noEmit` + `npm run build`.
  - Build and push container image to GHCR.
  - SSH deployment to Azure VM, regenerate `.env.production`, restart Docker compose.
  - Health check against `/api/metrics`.
  - Optional Wazuh webhook config sync on DigitalOcean host.
- Secrets used (observed):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VIRUS_TOTAL_API_KEY`
  - `GEMINI_API_KEY`
  - `AGENT_SECRET`
  - `CRON_SECRET`
  - `AZURE_TENANT_ID`
  - `AZURE_CLIENT_ID`
  - `AZURE_CLIENT_SECRET`
  - `DISCORD_ESCALATION_WEBHOOK_URL`
  - `AZURE_SSH_PRIVATE_KEY`
  - `AZURE_VM_IP`
  - `WAZUH_WEBHOOK_SECRET`
  - `WAZUH_API_TOKEN`
  - `DO_SSH_PRIVATE_KEY`
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ZONE_ID`
  - `DO_SSH_PRIVATE_KEY_RAW`
  - `GITHUB_TOKEN`

#### l1-triage.yml (hourly)

- Trigger:
  - cron `0 * * * *`
  - manual dispatch.
- What it does:
  - `curl GET /api/cron/l1-triage` with bearer `CRON_SECRET`.
  - Discord notification on failure.
- Secrets:
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `DISCORD_ESCALATION_WEBHOOK_URL`

#### l2-respond.yml (every 15 min)

- Trigger:
  - cron `*/15 * * * *`
  - manual dispatch.
- What it does:
  - `curl GET /api/cron/l2-respond`.
  - Discord notification on failure.
- Secrets:
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `DISCORD_ESCALATION_WEBHOOK_URL`

#### l3-hunt.yml (every 6 hours)

- Trigger:
  - cron `0 */6 * * *`
  - manual dispatch.
- What it does:
  - `curl GET /api/cron/l3-hunt`.
  - Discord notification on failure.
- Secrets:
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `DISCORD_ESCALATION_WEBHOOK_URL`

#### wazuh-health.yml (every 30 min)

- Trigger:
  - cron `*/30 * * * *`
  - manual dispatch.
- What it does:
  - `curl GET /api/infrastructure/wazuh-health`.
  - Parses JSON field `overall`; fails workflow when `down`.
  - Discord notification on failure.
- Secrets:
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `DISCORD_ESCALATION_WEBHOOK_URL`

#### daily-metrics.yml (23:00 UTC)

- Trigger:
  - cron `0 23 * * *`
  - manual dispatch.
- What it does:
  - `curl POST /api/platform/metrics` with `CRON_SECRET`.
  - Discord notification on failure.
- Secrets:
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `DISCORD_ESCALATION_WEBHOOK_URL`

#### rollback.yml

- Trigger:
  - manual dispatch with optional `commit_sha`.
- What it does:
  - SSH to Azure VM, hard reset target commit, rebuild and restart compose stack.
  - Post-rollback health check against local `/api/metrics`.
  - Discord status notification.
- Secrets:
  - `AZURE_SSH_PRIVATE_KEY`
  - `AZURE_VM_IP`
  - `DISCORD_ESCALATION_WEBHOOK_URL`

### 7. ENVIRONMENT VARIABLES REFERENCE

Observed from source and workflows.

| Name                           | Purpose                                      | Where used                                            | Required/Optional               | Example                                |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------------- | ------------------------------- | -------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL       | Supabase base URL                            | broad (`server.js`, `app/api/*`, `lib/*`)             | Required                        | `https://xxxx.supabase.co`             |
| NEXT_PUBLIC_SUPABASE_ANON_KEY  | Client-side Supabase auth                    | auth/session routes and client                        | Required                        | `sb_publishable_xxx`                   |
| SUPABASE_SERVICE_ROLE_KEY      | privileged DB/service ops                    | most server routes and cron                           | Required                        | `sb_service_role_xxx`                  |
| CRON_SECRET                    | authorizes scheduler routes                  | `/api/cron/*`, platform metrics, training export      | Required for cron flows         | `******`                               |
| AGENT_SECRET                   | authorizes internal agent action routes + WS | `server.js`, `/api/actions/*`, l2 flows               | Required for autonomous actions | `******`                               |
| GEMINI_API_KEY                 | Gemini model requests                        | `lib/ollama-client.ts`, triage/reviewer flows         | Required for cloud AI           | `AIza...***`                           |
| OLLAMA_BASE_URL                | local Ollama endpoint                        | `lib/ollama-client.ts`, health route                  | Optional (fallback path)        | `http://localhost:11434`               |
| OLLAMA_MODEL                   | local model name                             | `lib/ollama-client.ts`                                | Optional (defaulted)            | `llama3.1:8b`                          |
| VIRUS_TOTAL_API_KEY            | VT lookups                                   | `lib/static-analysis.ts`, scanner pipeline            | Optional for full scanning      | `******`                               |
| URLHAUS_AUTH_KEY               | URLHaus feed access                          | IOC reader/hunt pipeline                              | Optional                        | `******`                               |
| WAZUH_WEBHOOK_SECRET           | authenticates Wazuh webhook posts            | `/api/connectors/wazuh` and deploy workflow           | Required for Wazuh webhook      | `******`                               |
| WAZUH_MANAGER_IP               | Wazuh manager host                           | `lib/wazuh-client.ts`, health/update routes           | Required for Wazuh API          | `167.172.85.62`                        |
| WAZUH_API_PASSWORD             | Wazuh API auth password                      | `lib/wazuh-client.ts`                                 | Required for Wazuh API          | `******`                               |
| WAZUH_API_TOKEN                | injected in deploy workflow                  | deploy-only env template                              | Optional in app runtime         | `******`                               |
| CLOUDFLARE_API_TOKEN           | WAF block API                                | `/api/actions/block-ip`                               | Optional (no-op if missing)     | `******`                               |
| CLOUDFLARE_ZONE_ID             | target zone for WAF                          | `/api/actions/block-ip`                               | Optional (no-op if missing)     | `******`                               |
| DISCORD_ESCALATION_WEBHOOK_URL | Discord notification webhook                 | workflows + escalation notifications                  | Optional                        | `https://discord.com/api/webhooks/***` |
| DISCORD_WEBHOOK_URL            | scanner Discord notifications                | `app/api/v1/scan/route.ts`, `lib/supabase/actions.ts` | Optional                        | `https://discord.com/api/webhooks/***` |
| AZURE_TENANT_ID                | Graph auth                                   | `lib/microsoft/graphClient.ts`                        | Required for identity chain API | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| AZURE_CLIENT_ID                | Graph auth app ID                            | `lib/microsoft/graphClient.ts`                        | Required for identity chain API | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| AZURE_CLIENT_SECRET            | Graph auth secret                            | `lib/microsoft/graphClient.ts`                        | Required for identity chain API | `******`                               |
| NEXT_PUBLIC_APP_URL            | workflow target URL                          | GitHub workflows                                      | Required in workflows           | `https://phishslayer.tech`             |
| INTERNAL_API_URL               | internal server-to-server calls              | cron routes                                           | Required for cron chaining      | `http://localhost:3000`                |
| NEXT_PUBLIC_SITE_URL           | canonical site URL                           | deploy/build/runtime metadata                         | Optional                        | `https://phishslayer.tech`             |
| RESEND_API_KEY                 | outbound email provider                      | email service                                         | Optional (build warned missing) | `re_***`                               |
| RESEND_FROM_EMAIL              | sender identity                              | email service                                         | Optional                        | `soc@phishslayer.tech`                 |
| DO_SSH_PRIVATE_KEY             | remote infra operations                      | update routes/workflow scripts                        | Optional                        | `-----BEGIN...`                        |
| DO_SSH_USER                    | remote infra user                            | update routes                                         | Optional                        | `root`                                 |
| GEO_IP_API                     | geolocation enrichment                       | intel/recon flows                                     | Optional                        | `https://...`                          |
| HITL_MODE                      | human-in-the-loop override                   | agent logic toggles                                   | Optional                        | `true`                                 |
| NODE_ENV                       | runtime mode                                 | server and build behavior                             | Required by Node                | `production`                           |

Variables observed but platform-dependent OS envs:

- `APPDATA`, `HOME`, `TEMP` (not product configuration variables)

### 8. USER GUIDE — NAVIGATION & USAGE

#### Login / Auth flow

1. Navigate to auth pages under `app/auth/*` (`/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`).
2. Session callback handled by Clerk.
3. Middleware session updates run in `middleware.ts` via `updateSession`.

#### Dashboard overview

1. Open `/dashboard`.
2. The page aggregates scans/incidents/intel and renders command-center widgets.
3. Real-time agent status appears through dashboard widgets and WebSocket feed.

#### Alert feed and real-time updates

1. Open `/dashboard/agents` and `/dashboard/escalations`.
2. The browser subscribes to `/api/dashboard/ws` through `useAgentWebSocket`.
3. Incoming telemetry and command results update state panels.

#### URL scanner usage (step by step)

1. Open `/dashboard/scans` (or API `/api/v1/scan`).
2. Submit target (domain/IP).
3. Pipeline executes whitelist -> proprietary intel -> external scan.
4. Review verdict and risk score in scan history table.

#### Static analysis usage

1. Trigger static analysis via API `POST /api/analysis/static` (L3 may auto-trigger for Wazuh file alerts).
2. View output fields like entropy risk, suspicious strings, VT score, MITRE mapping.

#### Viewing reasoning chains and audit docs

1. Reasoning API: `GET /api/reasoning`.
2. Training export API: `GET /api/platform/training-data`.
3. Audit logs UI: `/dashboard/audit`.

#### Sigma rules management

1. Generate rule through `POST /api/detection/sigma` with `alert_id`.
2. List generated rules through `GET /api/detection/sigma`.

#### CTEM exposure tracking

1. Insert/update exposures through `POST /api/detection/ctem`.
2. Query exposures through `GET /api/detection/ctem`.

#### SOC metrics dashboard

1. View MTTR-focused page at `/dashboard/mttr`.
2. Pull timeline/MTTR from `/api/v2/identity/timeline`.
3. Daily metrics rollups via `/api/platform/metrics`.

#### Organization and team management

1. Create/list organizations via `/api/platform/organizations`.
2. Member records managed in `organization_members` when owner provided.

#### Connector configuration

1. Register connector via `POST /api/platform/connectors`.
2. List connectors via `GET /api/platform/connectors?organization_id=...`.

#### Infrastructure health panel

1. Probe Wazuh via `/api/infrastructure/wazuh-health`.
2. Probe Ollama via `/api/infrastructure/ollama-health`.

#### Agent status monitoring

1. Endpoint agents connect to `/api/agent/ws` with `x-agent-secret` and metadata headers.
2. Dashboard consumes summarized agent list over `/api/dashboard/ws`.

### 9. AGENT SWARM — HOW IT WORKS

What triggers each agent:

- L1:
  - Triggered hourly by workflow `l1-triage.yml` hitting `/api/cron/l1-triage`.
  - Can also be called directly through `/api/agent/triage`.
- L2:
  - Triggered every 15 minutes by `l2-respond.yml` hitting `/api/cron/l2-respond`.
- L3:
  - Triggered every 6 hours by `l3-hunt.yml` hitting `/api/cron/l3-hunt`.

Decision thresholds and confidence scoring:

- L1 (`app/api/agent/triage/route.ts` prompt rules):
  - Escalate Wazuh when `rule_level >= 12` or high-risk behavior keywords.
  - Escalate scans when `risk_score >= 70` or `malicious_count >= 3`.
- L2 (`app/api/cron/l2-respond/route.ts`):
  - Execute autonomous action only when confidence `>= 0.85` and severity high/critical.
  - Otherwise mark manual review.
- L3 reviewer (`app/api/agent/hunter/review/route.ts`):
  - `STORM` when escalations in 1 hour > 10.
  - `SUSPICIOUS` for 5-10.
  - `NORMAL` below 5.
  - `HALT` only with high confidence storm conditions.

How circuit breakers protect against runaway agents:

- L3 reviewer inserts halt state into `agent_circuit_breakers` and escalates to humans.
- Reviewer still emits audit trail in `audit_logs`.

How reasoning chains are saved:

- Shared `saveReasoningChain` helper writes to `agent_reasoning` from L1/L2/L3.
- Includes decision, confidence, IO context, action list, model used, execution time.

How actuator hands are triggered:

- L2 internal calls:
  - `/api/actions/isolate-identity`
  - `/api/actions/block-ip`
- Escalation route `/api/actions/escalate` used for manual-review handoff.

Ollama vs Gemini fallback decision logic:

- Implemented by `generateWithFallback` in `lib/ollama-client.ts`.
- Callers provide both local prompt and Gemini payload.
- If local model call fails or times out, request falls back to Gemini endpoint.

### 10. DEPLOYMENT GUIDE

Prerequisites:

- Node.js 20+
- Docker and Docker Compose
- Supabase project with required tables
- Azure VM (deployment target)
- Optional Wazuh manager host and Cloudflare account

Azure VM setup:

1. Provision Linux VM with Docker/Compose.
2. Configure SSH access (used by `deploy.yml` and `rollback.yml`).
3. Clone repository path expected by workflow (`/home/mzain2004/Phish-Slayer`).

Docker build and run:

1. Build: `docker compose build`.
2. Run: `docker compose up -d`.
3. Verify health endpoint: `GET /api/metrics` returns HTTP 200.

Nginx configuration:

- Not found in codebase.

GitHub Actions CI/CD setup:

1. Configure all secrets referenced in section 6.
2. Enable workflows:
   - `deploy.yml`
   - `l1-triage.yml`
   - `l2-respond.yml`
   - `l3-hunt.yml`
   - `wazuh-health.yml`
   - `daily-metrics.yml`
   - `rollback.yml`

Supabase setup (tables + RLS):

1. Apply migrations in `supabase/migrations`.
2. Confirm SQL-created tables and policies exist.
3. For additional inferred tables (`alerts`, `escalations`, etc.), schema SQL is not present in repo and must be provisioned externally.

Wazuh webhook configuration:

1. Configure Wazuh integration to post JSON alerts to `/api/connectors/wazuh`.
2. Provide API key matching `WAZUH_WEBHOOK_SECRET`.
3. Validate through `wazuh-health.yml` and `GET /api/infrastructure/wazuh-health`.

Environment variables setup:

1. Populate `.env.production` on deployment host (workflow writes this file).
2. Ensure required auth/secrets are available for Supabase, Gemini, Cron, and Agent paths.

Post-deployment verification checklist:

1. `npm run build` passes.
2. `/api/metrics` returns 200.
3. `/api/infrastructure/wazuh-health` returns non-down `overall`.
4. WebSocket endpoints accept connections (`/api/agent/ws`, `/api/dashboard/ws`).
5. Cron workflows execute successfully.
6. Sample scan via `/api/v1/scan` succeeds for authorized API key.
7. Audit rows appear in `audit_logs` for key actions.

### 11. KNOWN ISSUES & ROADMAP

Current open issues with status (from audited code):

- Issue: Undefined variable in `server.js` inside `sendCommandToAgent` logs (`agentId` referenced without declaration).
  - Status: present in codebase.
- Issue: Full SQL DDL for many operational tables is not in repository migrations.
  - Status: present in codebase (partial migration set only).
- Issue: Build emits optional env warning for `RESEND_API_KEY`.
  - Status: non-blocking.

Requested roadmap/business items:

- Oracle ARM Ollama deployment plan: not found in codebase.
- Fine-tuning roadmap (target: 1000+ reasoning rows): explicit roadmap not found in codebase. Export path exists at `/api/platform/training-data`.
- Microsoft for Startups application status: not found in codebase.
- Kevin Branch MSSP pilot plan: not found in codebase.

### 12. BUSINESS CONTEXT

Business context available from codebase:

- Product positioning in `README.md`: enterprise AI security platform focused on identity continuity over alert volume.
- Audience in `README.md`: incident responders, SOC engineers, detection engineers, security leadership.
- Pricing UI exists in `app/pricing/page.tsx` with tiered plans.

Requested business details:

- Target market and pricing (`$200K/year per MSSP`): not found in codebase.
- Revenue model and ARR targets: not found in codebase.
- Competitive positioning beyond README-level statements: not found in codebase.
- Investor readiness status: not found in codebase.
