# Phish-Slayer v2 Documentation

Phish-Slayer v2 is an enterprise AI threat intelligence platform built for incident response teams that need context, not more noise.

## Executive Summary

The v2 strategy is a deliberate pivot from alert acceleration to identity continuity.

- v1 problem framing: "How do we alert faster?"
- v2 problem framing: "How do we reconstruct fragmented telemetry into a trusted incident narrative?"

Phish-Slayer now centers on an Identity-Stitching Engine that enforces strict session lineage:

Who -> Device -> Auth Context -> Privilege -> Action -> Impact

This lineage is the primary object in the system. Alerts are now secondary outputs of a complete identity sequence, not isolated events.

## v2 Philosophy: Identity Continuity Over Alert Volume

Senior IR feedback made one issue clear: isolated detections are expensive to triage and unreliable under pressure. Phish-Slayer v2 reduces analyst uncertainty by stitching security signals into a single, ordered session story.

Key outcomes:

- Faster root cause identification
- Lower mean time to recovery (MTTR)
- Higher confidence in containment decisions
- Less analyst fatigue from disconnected alerts

## Target Audience

Primary audiences for v2:

- Incident Response (IR) leads and SOC analysts
- Security engineering teams operating Microsoft-centric estates
- SREs responsible for platform reliability, cost, and operational safety

Secondary audiences:

- Security leadership tracking blast radius and business impact
- Platform engineers extending telemetry integrations and automations

## Product Pillars (v2)

1. Identity-Stitching Engine as the core detection and investigation primitive
2. UTC-normalized telemetry across Entra ID, Microsoft Graph, Defender, and endpoint agents
3. Cost-aware continuous monitoring designed to prevent uncontrolled cloud/API spend
4. Operator-first SPA command center focused on incident continuity and recovery speed

## Non-Negotiable Architecture Rules

- Every incident must map to the canonical sequence: Who -> Device -> Auth Context -> Privilege -> Action -> Impact
- UTC is mandatory for all stored, processed, and rendered timestamps
- No feature ships if it increases MTTR or creates uncontrolled runtime/API cost
- UI design must conform to the Motionsites protocol in DESIGN_SYSTEM.md

## Documentation Index

- ARCHITECTURE_v2.md: v2 system architecture, data flow, normalization, and cost constraints
- DESIGN_SYSTEM.md: strict UI/Tailwind/animation standards and generator guardrails
- ROADMAP.md: implementation plan and phase gates for engine and SPA dashboard

## Source of Truth Policy

This folder is the authoritative reference for v2 engineering and design decisions.

If implementation diverges from these docs, update the docs first, then ship the change.
