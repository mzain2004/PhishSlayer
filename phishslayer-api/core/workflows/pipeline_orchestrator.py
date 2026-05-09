"""
pipeline_orchestrator.py — Autonomous L1→L2→L3 pipeline coordinator.

Ruflo source: plugins/ruflo-autopilot/skills/autopilot-loop/SKILL.md
Pattern: check status → predict next action → execute → log → schedule next.

PhishSlayer mapping:
  L1 (LangGraph classify+route) → L2 (investigator, if escalated) → L3 (hunter swarm, if escalated)

Adapter — wraps existing agents. Does NOT replace individual agent classes.
Invoked by app/api/cron/l1-triage route or the GitHub Actions pipeline.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class PipelineRun:
    """Structured output of one pipeline iteration. Persisted to state store."""
    alert_id: str
    org_id: str
    l1_decision: str = ""
    l1_confidence: float = 0.0
    l2_verdict: Optional[str] = None
    l3_verdict: Optional[str] = None
    requires_human: bool = False
    stages_run: list[str] = field(default_factory=list)
    error: Optional[str] = None


class PipelineOrchestrator:
    """
    Ruflo autopilot-loop pattern adapted for PhishSlayer's L1→L2→L3 chain.

    Each level receives only the structured output of the previous level.
    Clean context is enforced by the _l1_state_to_triage() adapter.
    Consequence gate: pipeline stops at any level that sets requires_human_approval.

    Usage:
        orchestrator = PipelineOrchestrator(l1_workflow, l2_agent, l3_coordinator)
        run = await orchestrator.run_one(alert_id, org_id, raw_alert)
    """

    def __init__(self, l1_workflow, l2_agent, l3_coordinator, state_store=None):
        """
        l1_workflow: compiled LangGraph graph (from core.workflows.l1_workflow.get_workflow())
        l2_agent:    L2InvestigatorAgent instance
        l3_coordinator: SwarmPipelineCoordinator instance
        state_store: optional StateStore for persistence
        """
        self._l1 = l1_workflow
        self._l2 = l2_agent
        self._l3 = l3_coordinator
        self._store = state_store

    async def run_one(self, alert_id: str, org_id: str, raw_alert: dict) -> PipelineRun:
        """
        Execute one pipeline iteration for a single alert.
        Returns PipelineRun. Never raises.
        """
        run = PipelineRun(alert_id=alert_id, org_id=org_id)

        # ── L1: LangGraph state machine ──────────────────────────────────────
        try:
            l1_state = await asyncio.get_event_loop().run_in_executor(
                None,
                self._l1.invoke,
                {
                    "alert_id": alert_id,
                    "org_id": org_id,
                    "raw_alert": raw_alert,
                    "severity": "",
                    "attack_type": "",
                    "source_ip": "",
                    "affected_asset": "",
                    "enrichments": {},
                    "osint_results": {},
                    "rag_context": [],
                    "confidence": 0.0,
                    "decision": "",
                    "reasoning": "",
                    "tool_calls": [],
                    "openspace_budget_remaining": 8000,
                    "consequence_prediction": {},
                },
            )
            run.l1_decision = l1_state.get("decision", "close")
            run.l1_confidence = float(l1_state.get("confidence", 0.0))
            run.stages_run.append("l1")
        except Exception as e:
            log.error("[pipeline] L1 failed alert=%s: %s", alert_id, e)
            run.error = f"l1_failed: {e}"
            run.requires_human = True
            return run

        if run.l1_decision == "close":
            return run

        # ── L2: Investigator ─────────────────────────────────────────────────
        l2_out = None
        if run.l1_decision in ("escalate_l2", "escalate_l3"):
            try:
                triage = self._l1_state_to_triage(l1_state)
                l2_out = await self._l2.investigate(alert_id, org_id, triage)
                run.l2_verdict = l2_out.verdict
                run.requires_human = l2_out.requires_human_approval
                run.stages_run.append("l2")
            except Exception as e:
                log.error("[pipeline] L2 failed alert=%s: %s", alert_id, e)
                run.error = f"l2_failed: {e}"
                run.requires_human = True
                return run

        if run.requires_human:
            return run  # consequence gate — stop before L3

        # ── L3: Hunter swarm ─────────────────────────────────────────────────
        should_run_l3 = (
            run.l1_decision == "escalate_l3"
            or (l2_out is not None and l2_out.escalate_to_l3)
        )
        if should_run_l3 and l2_out is not None:
            try:
                from dataclasses import asdict
                l3_out = await self._l3.run(asdict(l2_out), org_id)
                run.l3_verdict = l3_out.final_verdict
                run.requires_human = run.requires_human or l3_out.requires_human_approval
                run.stages_run.append("l3")

                if self._store:
                    await self._store.save(alert_id, "pipeline", {
                        "l1_decision": run.l1_decision,
                        "l2_verdict": run.l2_verdict,
                        "l3_verdict": run.l3_verdict,
                        "requires_human": run.requires_human,
                    }, org_id)
            except Exception as e:
                log.error("[pipeline] L3 failed alert=%s: %s", alert_id, e)
                run.error = f"l3_failed: {e}"
                run.requires_human = True

        return run

    @staticmethod
    def _l1_state_to_triage(l1_state: dict):
        """
        Map LangGraph L1State → TriageResult for L2 input.
        Clean context adapter: L2 receives only this structured subset.
        """
        from agents.l1_triage import TriageResult
        decision = l1_state.get("decision", "close")
        return TriageResult(
            alert_id=l1_state.get("alert_id", ""),
            org_id=l1_state.get("org_id", ""),
            attacker_intent=l1_state.get("reasoning", ""),
            mitre_techniques=[],
            likely_next_move="",
            is_decoy_or_distraction=False,
            is_real_threat=l1_state.get("confidence", 0.0) > 0.5,
            confidence=float(l1_state.get("confidence", 0.0)),
            immediate_actions=list(l1_state.get("tool_calls", [])),
            indicators_to_watch=[l1_state.get("source_ip", "")],
            escalate_to_l2=decision == "escalate_l2",
            requires_human_approval=False,
            escalation_reason=l1_state.get("reasoning"),
            verdict=decision,
        )
