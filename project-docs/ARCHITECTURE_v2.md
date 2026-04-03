# ARCHITECTURE_v2.md

## Purpose

Define the authoritative v2 architecture for Phish-Slayer, optimized for:

- Identity continuity across fragmented telemetry
- Strict sequence reconstruction for investigation quality
- Lower MTTR under real operational pressure
- Predictable cloud and API cost under continuous scanning

## Core Architecture Pivot

Phish-Slayer v2 does not optimize for alert count or alert speed in isolation.
It optimizes for complete identity-linked incident narratives.

The system-level primitive is the Identity Session Graph built by the Identity-Stitching Engine.

## Canonical Sequence Contract

Every threat entity must map to this exact lineage:

Who -> Device -> Auth Context -> Privilege -> Action -> Impact

The sequence is mandatory and ordered. Any missing link must be represented explicitly as unknown, never silently dropped.

## Identity-Stitching Engine

### Responsibilities

1. Ingest telemetry from Microsoft Graph, Entra ID, Defender, and endpoint agents
2. Normalize event schemas and timestamps into a canonical model
3. Correlate events into a single identity session lineage
4. Emit risk-evaluated incidents with full investigative context

### Canonical Event Fields

Minimum fields required in normalized storage:

- event_id
- event_source
- tenant_id
- user_id
- user_principal_name
- device_id
- device_name
- auth_context_id
- privilege_state
- action_type
- impact_type
- observed_at_utc
- ingested_at_utc
- correlation_keys
- confidence_score

### Correlation Keys (Priority Order)

1. Session identifiers from Entra/Graph (when available)
2. User + device + bounded UTC window
3. IP + user + auth context fingerprint
4. Process lineage + host identity for endpoint-side joins

## Data Flow (Microsoft Graph to Endpoint Correlation)

1. Collection Layer

- Pull Entra sign-ins, audit logs, role assignments, and Defender events.
- Receive endpoint telemetry from Phish-Slayer agents and Defender connectors.

2. Normalization Layer

- Convert each source payload to canonical event schema.
- Enforce UTC conversion at ingestion boundary.

3. Stitching Layer

- Build sequence edges in strict order:
  - Who -> Device
  - Device -> Auth Context
  - Auth Context -> Privilege
  - Privilege -> Action
  - Action -> Impact
- Persist graph edges with confidence and provenance metadata.

4. Detection and Scoring Layer

- Execute rule/ML checks against complete sequences, not single records.
- Promote incidents only when sequence confidence passes threshold.

5. Response Layer

- Render incident timeline and graph in SPA command center.
- Trigger containment and communication workflows with lineage attached.

## Time Normalization (Mandatory UTC)

### Rules

- All timestamps must be stored as UTC ISO-8601 with trailing Z.
- All event ordering logic uses observed_at_utc first, ingested_at_utc second.
- UI may localize display only at render time; storage and APIs stay UTC.

### Enforcement Points

- Ingestion adapters reject non-parsable timestamps.
- Normalizer logs source timezone assumptions.
- Stitching jobs fail closed when required UTC fields are missing.

### Why It Matters

Without strict UTC normalization, sequence edges break across daylight shifts, mixed source timezones, or delayed ingestion, producing false incident narratives.

## MTTR-First Reliability Principles

- Sequence integrity over alert volume
- Fast replay and reconstruction from persisted normalized events
- Deterministic incident IDs for rehydration across retries
- Degraded mode with partial sources while preserving lineage quality flags

## Cost Control Constraints (GCP/AWS + API)

### Runtime Guardrails

- Bounded polling intervals by source criticality tier
- Incremental fetch using checkpoint cursors, never full re-scan by default
- Event deduplication before enrichment
- Tiered storage retention (hot, warm, cold)

### API Cost Controls

- Cache expensive Graph lookups with TTL
- Batch requests where API supports it
- Backoff and concurrency caps per connector
- Suppress repeated enrichments for identical correlation keys

### Compute Cost Controls

- Partition processing by tenant and time slice
- Queue-based asynchronous enrichment for non-critical context
- Feature flags for expensive analytics paths
- Autoscale with strict max worker ceilings

## Failure Modes and Recovery

### Expected Failure Modes

- Upstream API throttling
- Delayed source delivery
- Partial connector outage
- Out-of-order event arrival

### Recovery Strategy

- Durable ingestion queue with idempotent consumers
- Reconciliation jobs to restitch windows affected by late events
- Automatic downgrade to reduced enrichment mode when budget limits are hit
- Incident confidence labeling when source completeness is degraded

## Security and Compliance Considerations

- Least-privilege tokens for all Microsoft integrations
- Field-level sensitivity tagging in normalized schema
- Immutable audit trail for stitch decisions and confidence scoring
- Region-aware data residency controls where required

## Architecture Acceptance Criteria

A release is v2-compliant only if:

1. Every incident in production is representable by the canonical sequence.
2. UTC normalization is enforced at ingestion and storage boundaries.
3. Recovery workflows can rebuild sequence graphs after partial outage.
4. Cost guardrails prevent uncontrolled spend during continuous scanning.
5. Mean time to investigative context is materially reduced versus v1 baseline.
