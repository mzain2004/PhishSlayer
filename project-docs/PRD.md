# PRD.md — Product Requirements Document

# Phish-Slayer v2

---

## 1. Product Vision

Phish-Slayer v2 is an enterprise AI threat intelligence platform for SOC and IR teams operating under high-pressure incident timelines.

The v2 mission is to turn fragmented telemetry into trustworthy incident continuity by reconstructing identity-linked attack sequences end to end.

Core product promise:

- Reduce analyst uncertainty during triage and containment
- Cut MTTR by improving investigative context, not increasing alert volume
- Provide a single command surface for identity, endpoint, auth, privilege, action, and impact correlation

---

## 2. Strategic Pivot (v1 -> v2)

### v1 Framing (Deprecated)

"Faster alerts" as the primary value proposition.

### v2 Framing (Required)

"Identity continuity over alert volume" as the primary value proposition.

The platform now competes on sequence integrity and response confidence.

---

## 3. Core Problem Statement

SOC teams do not fail because they lack alerts; they fail because telemetry is fragmented across identity logs, endpoint events, and privilege/audit trails.

This fragmentation increases:

- Triage latency
- False investigative branches
- Containment hesitation
- Recovery time

Phish-Slayer v2 solves this by stitching cross-source events into a single incident lineage.

---

## 4. Canonical Sequence Contract (Non-Negotiable)

Every detected threat must map to this exact ordered sequence:

Who -> Device -> Auth Context -> Privilege -> Action -> Impact

Requirements:

1. Sequence order is immutable.
2. Missing links must be explicit as unknown, never dropped.
3. All incident views, APIs, and automations must preserve this lineage.

---

## 5. Product Pillars (v2)

1. **Identity-Stitching Engine**
   Correlates Entra ID, Microsoft Graph, Defender, and endpoint telemetry into canonical sequence graphs.
2. **Time Integrity (UTC)**
   Enforces UTC normalization at ingestion, storage, processing, and ordering boundaries.
3. **MTTR-First Operations**
   Prioritizes fast, reliable incident reconstruction and replay after partial outages.
4. **Cost-Aware Continuous Monitoring**
   Controls API and compute spend via checkpointed fetches, batching, dedupe, and bounded concurrency.
5. **Operator-Grade SPA Command Center**
   Presents incident continuity in a graph/timeline workflow with high-clarity interactions.

---

## 6. Target Users

- **Primary:** Incident Response leads and SOC analysts
- **Secondary:** Security engineers and platform/SRE teams
- **Tertiary:** Security leadership consuming blast-radius and impact context

---

## 7. Functional Requirements

### 7.1 Identity-Stitching Engine

- Ingest telemetry from Microsoft Graph, Entra ID, Defender, and endpoint agents.
- Normalize events to canonical schema with provenance.
- Build and persist session lineage per canonical sequence.
- Score sequence confidence and source completeness.

### 7.2 Time Normalization

- Store all telemetry timestamps as UTC ISO-8601 with trailing Z.
- Use observed time as primary ordering key and ingested time as fallback.
- Reject or quarantine records with invalid/unresolvable time fields.

### 7.3 Detection and Incidenting

- Run detection logic against stitched sequences, not isolated records.
- Attach confidence and completeness metadata to all incidents.
- Preserve deterministic incident identifiers for replay consistency.

### 7.4 Dashboard Experience (SPA)

- Single connected workflow from incident list -> sequence timeline -> response action.
- Interactive graph-first incident detail views.
- Live update patterns that maintain context continuity.

### 7.5 Integrations and Response

- Support webhook and downstream response triggers with full lineage context.
- Ensure idempotent response actions under retries and partial failures.

---

## 8. Non-Functional Requirements

### 8.1 Reliability and Recovery

- Durable ingestion queues and idempotent processing.
- Reconciliation/replay jobs for delayed and out-of-order events.
- Degraded mode with explicit confidence labeling.

### 8.2 Cost Controls

- Incremental fetches with checkpoint cursors.
- Connector-level concurrency limits and backoff.
- Batched enrichment and deduplication before expensive calls.
- Upper worker ceilings to prevent runaway autoscaling costs.

### 8.3 Security and Auditability

- Least-privilege access for all connectors.
- Immutable audit trail for stitch and scoring decisions.
- Sensitive field handling with clear data classification.

---

## 9. UI/UX System Requirements (Motionsites Protocol)

Visual and interaction standards are mandatory and must match DESIGN_SYSTEM.md.

Required:

- Pure black atmospheric background (#000000)
- Deep Purple (#A78BFA) and Neon Teal (#2DD4BF) blurred cosmic lighting
- Liquid glass surfaces (bg-white/5, backdrop-blur-3xl)
- Aeonik or Space Grotesk for headings/metrics; Inter for body/logs
- Framer Motion transitions across SPA flows

Forbidden:

- Flat single-color or gray-heavy backgrounds
- Opaque, boxy panel systems replacing glass material
- Serif, gothic, script, or novelty typography
- Disconnected static pages that break flow continuity

---

## 10. Business Model and Packaging

Three-tier SaaS packaging:

| Tier              | Internal Key    | Price (Monthly) |
| ----------------- | --------------- | --------------- |
| Recon             | recon           | $0              |
| SOC Pro           | soc_pro         | $99             |
| Command & Control | command_control | $299            |

Subscription source of truth:

- Supabase profiles.subscription_tier
- Paid checkout via Paddle billing flow

---

## 11. Success Metrics (v2)

Primary outcomes:

- MTTR reduction versus v1 incident baseline
- Time to complete incident context (full sequence render)
- Reduction in analyst re-triage loops per incident
- Sequence completeness rate for production incidents

Operational outcomes:

- Ingestion-to-stitch latency within SLO
- Replay success rate after partial outage
- Cost per processed event within budget envelope

---

## 12. Out of Scope (Current v2)

- Mobile native applications
- Full multi-tenant organization management layer
- Broad custom threat feed marketplace integrations
- SOAR playbook authoring suite

---

## 13. Dependencies and Source of Truth Mapping

- Architecture requirements: ARCHITECTURE_v2.md
- UI/UX constraints: DESIGN_SYSTEM.md
- Delivery sequencing: ROADMAP.md
- Executive overview: README.md

If any implementation conflicts with this PRD, the docs must be updated before release.
