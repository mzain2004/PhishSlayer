# Phish-Slayer v2

Phish-Slayer v2 is an enterprise AI security platform for Blue Team operations focused on one core outcome: restoring identity continuity across fragmented telemetry.

## Executive Summary

Most SOC stacks optimize for alert volume and alert speed. That approach still leaves analysts with disconnected evidence and slow incident resolution.

Phish-Slayer v2 shifts the operating model from "more alerts" to "coherent incident lineage." Every high-signal incident must resolve into a strict session sequence:

Who -> Device -> Auth Context -> Privilege -> Action -> Impact

If that chain is incomplete, the incident is incomplete.

## v2 Philosophy: Identity Continuity Over Alert Volume

1. We prioritize sequence integrity over raw event count.
2. We stitch endpoint telemetry and cloud identity telemetry into a single investigative graph.
3. We normalize all timestamps to UTC to prevent timeline drift and broken correlations.
4. We reduce MTTR by giving responders one timeline, one actor trail, and one blast-radius view.
5. We design for reliability and cost discipline under continuous scanning workloads.

## Target Audience

- Primary: Incident Response analysts and SOC engineers handling live containment and triage.
- Secondary: Detection engineers and SREs responsible for telemetry reliability and response tooling.
- Tertiary: Security leadership monitoring exposure, containment speed, and operational risk.

## What v2 Delivers

- Identity-Stitching Engine that correlates Microsoft Graph, Entra ID, Defender, and endpoint events.
- Deterministic sequence validation for each threat path.
- Unified timeline with strict UTC normalization.
- Incident context cards that show actor lineage, privilege transitions, and impact surface.
- Cost-aware ingestion and query architecture to avoid runaway API and cloud compute spend.

## Documentation Index (Single Source of Truth)

- [ARCHITECTURE_v2.md](ARCHITECTURE_v2.md): v2 engine internals, data flow, normalization, and infrastructure constraints.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): unbreakable UI rules under the Motionsites protocol.
- [ROADMAP.md](ROADMAP.md): execution plan for engineering delivery.

## Product Boundaries

In scope for v2:

- Identity stitching and sequence enforcement.
- Interactive SPA investigation dashboard.
- MTTR-focused workflows and reliability instrumentation.

Out of scope for v2:

- Feature work that increases alert volume without improving identity continuity.
- Unbounded background scans that increase cloud/API cost without measurable MTTR reduction.
- Detached static pages that are not integrated into the investigation flow.
