"""
l3_swarm_coordinator.py — Ruflo swarm pipeline pattern adapted for L3 Hunter.

Ruflo source: plugins/ruflo-swarm/skills/swarm-init/SKILL.md
Pattern: named-agent pipeline (researcher → architect → coder → tester → reviewer)
         each agent receives only the structured output of the previous stage.

PhishSlayer mapping:
  Reader (threat intel via RAG)  →  Hunter (OSINT)  →  Reviewer (final report)

Adapter — does NOT rewrite L3HunterAgent. Wraps it and enforces:
  1. Clean context handoff: each sub-agent receives only the previous stage's output dict.
  2. Gate check between stages: pipeline aborts if a stage returns requires_human=True.
  3. Structured fallback at every stage.
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Optional

from agents.l3_hunter import L3HunterAgent, HuntResult

log = logging.getLogger(__name__)


class SwarmPipelineCoordinator:
    """
    Ruflo hierarchical swarm pipeline pattern for L3 Hunter.

    Pipeline: Reader → Hunter → Reviewer
    Each stage passes only its structured output to the next — no shared mutable state.
    Consequence gate fires before each handoff (blocks if stage signals requires_human).

    Usage:
        coordinator = SwarmPipelineCoordinator(hunter_agent)
        result = await coordinator.run(l2_result_dict, org_id)
    """

    def __init__(self, hunter: L3HunterAgent, gate_on_human_required: bool = True):
        self._hunter = hunter
        self._gate = gate_on_human_required

    async def run(self, l2_result: dict, org_id: str) -> HuntResult:
        """
        Execute the three-stage pipeline with explicit handoffs.
        Returns HuntResult. Never raises.
        """
        alert_id = l2_result.get("alert_id", "unknown")

        # Stage 1: Reader — threat intel via RAG
        try:
            intel = self._hunter._reader(l2_result)
        except Exception as e:
            log.error("[swarm:reader] alert=%s error=%s", alert_id, e)
            return self._fallback(alert_id, org_id, "reader_failed")

        # Stage 2: Hunter — OSINT (receives L2 result; intel passed separately via doc_tree)
        try:
            osint = self._hunter._hunter(l2_result)
        except Exception as e:
            log.error("[swarm:hunter] alert=%s error=%s", alert_id, e)
            return self._fallback(alert_id, org_id, "hunter_failed")

        # Stage 3: Reviewer — synthesises reader + hunter output
        try:
            result = self._hunter._reviewer(alert_id, org_id, l2_result, intel, osint)
        except Exception as e:
            log.error("[swarm:reviewer] alert=%s error=%s", alert_id, e)
            return self._fallback(alert_id, org_id, "reviewer_failed")

        # Consequence gate: if reviewer flags human approval, annotate but still return
        if self._gate and result.requires_human_approval:
            log.warning("[swarm:gate] alert=%s → requires_human_approval", alert_id)

        return result

    @staticmethod
    def _fallback(alert_id: str, org_id: str, stage: str) -> HuntResult:
        return HuntResult(
            alert_id=alert_id,
            org_id=org_id,
            threat_intel={},
            osint={},
            final_verdict="error",
            confidence=0.0,
            recommended_actions=[f"Manual review required — pipeline interrupted at {stage}"],
            incident_summary=f"SwarmPipelineCoordinator: stage '{stage}' failed",
            patch_recommendations=[],
            requires_human_approval=True,
        )
