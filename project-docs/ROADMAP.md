# ROADMAP.md

## Objective

Deliver Phish-Slayer v2 as an identity-continuity platform with a production-ready Identity-Stitching Engine and an interactive SPA command center.

## Guiding Constraints

- Optimize for MTTR reduction, not alert volume
- Enforce canonical sequence: Who -> Device -> Auth Context -> Privilege -> Action -> Impact
- Enforce UTC normalization at ingestion and storage boundaries
- Keep cloud compute and external API cost growth bounded

## Phase 0: Foundation Hardening (Week 0-1)

### Work

- Freeze v2 canonical schema and sequence contract
- Implement UTC validation utilities in shared libraries
- Add budget and concurrency guardrails for external connectors
- Define SLOs for ingestion latency, stitch latency, and replay recovery

### Exit Criteria

- Canonical schema published and versioned
- UTC validation integrated in all active ingestion paths
- Cost guardrails configurable per environment

## Phase 1: Identity-Stitching Engine MVP (Week 1-3)

### Work

- Build ingestion adapters for Entra sign-ins, audit logs, Defender, and endpoint telemetry
- Normalize all events into canonical format with provenance metadata
- Implement session correlation with confidence scoring and edge provenance
- Persist session graphs and deterministic incident IDs

### Exit Criteria

- End-to-end sequence generation for at least 80 percent of target test scenarios
- Unknown links explicitly represented instead of dropped
- Replay job reconstructs identical graph for the same event window

## Phase 2: Detection and Response Alignment (Week 3-5)

### Work

- Refactor detections to operate on stitched sequences
- Add incident confidence tiers and source-completeness flags
- Implement degraded-mode behavior for partial source outages
- Add idempotent response triggers tied to sequence IDs

### Exit Criteria

- No production detection depends solely on unstitched raw events
- Degraded mode tested for API throttle and source downtime scenarios
- Incident output includes full sequence context and confidence metadata

## Phase 3: SPA Command Center v2 (Week 4-7)

### Work

- Rebuild dashboard flows around identity sequence timelines
- Implement graph-first incident detail view
- Apply full Motionsites design system with reusable glass primitives
- Add Framer Motion transitions for navigation, list updates, and panel states

### Exit Criteria

- Single connected SPA flow from alert list to sequence graph to response action
- No disconnected static pages in primary analyst journey
- UI passes DESIGN_SYSTEM.md compliance checklist

## Phase 4: Reliability, Cost, and Operations (Week 6-8)

### Work

- Add queue depth, stitch lag, and MTTR telemetry to operational dashboards
- Implement autoscaling with hard upper worker limits
- Add API usage budgeting and connector-level throttling alerts
- Validate backfill and replay runbooks with on-call simulations

### Exit Criteria

- MTTR improved against v1 baseline in controlled incident drills
- Cost per processed event remains within defined budget envelope
- On-call runbooks validated for throttle, outage, and delayed-ingestion incidents

## Cross-Functional Workstreams

### Security Engineering

- Least-privilege token scopes for Microsoft integrations
- Auditability for stitch decisions and graph mutations

### Platform/SRE

- Capacity modeling for continuous scanning workloads
- Release gates tied to SLO and cost regressions

### Product and Design

- Analyst workflow validation with IR practitioners
- UX iteration based on investigation speed and clarity metrics

## Quality Gates (Must Pass Before GA)

1. Sequence Integrity Gate

- 100 percent of GA incidents conform to canonical sequence model.

2. Time Integrity Gate

- 100 percent of stored event times are valid UTC with ordering guarantees.

3. Recovery Gate

- Replay successfully reconstructs sequence graphs after simulated partial outage.

4. Cost Gate

- Continuous scan mode does not exceed configured daily spend ceilings.

5. UX Gate

- Primary SOC workflow executes fully inside SPA without context loss.

## Immediate Next Actions (This Sprint)

1. Finalize canonical event schema and publish version 2.0.
2. Complete UTC normalization middleware in all ingestion adapters.
3. Ship first stitching pipeline with deterministic correlation keys.
4. Implement sequence timeline view in the dashboard shell.
5. Add cost and throttle observability panels for SRE review.
