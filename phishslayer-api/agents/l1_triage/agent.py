"""
L1TriageAgent (Phase 3 full implementation).
Extends PhishSlayerBaseAgent; runs the LangGraph l1_workflow.
"""
from __future__ import annotations

import agentops
from agentscope.message import Msg

from core.harness.base_agent import PhishSlayerBaseAgent
from core.workflows.l1_workflow import L1State, get_workflow
from observability.logger import AgentLogger


class L1TriageAgentV2(PhishSlayerBaseAgent):
    """Full L1 triage agent backed by the LangGraph state machine."""

    level = "l1"

    @agentops.track_agent(name="L1TriageAgentV2")
    def reply(self, x: Msg) -> Msg:
        """
        1. Build LangGraph initial state from incoming message
        2. Run l1_workflow (sync invoke)
        3. Return Msg with decision payload
        """
        payload: dict = x.content if isinstance(x.content, dict) else {"raw": str(x.content)}

        alert_id = payload.get("alert_id", "unknown")
        org_id = payload.get("org_id", "unknown")
        request_id = payload.get("request_id", "")

        _log = AgentLogger(
            agent_level="l1",
            alert_id=alert_id,
            org_id=org_id,
            request_id=request_id,
        )

        initial_state: L1State = {
            "alert_id": alert_id,
            "org_id": org_id,
            "raw_alert": payload.get("raw_alert", payload),
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
        }

        try:
            final_state: L1State = get_workflow().invoke(initial_state)
            _log.info("workflow_node_complete", node="l1_workflow")
        except Exception as exc:
            _log.error("workflow_error", error_code="L1_WORKFLOW_FAILED")
            final_state = {**initial_state, "decision": "escalate_l2", "reasoning": "WORKFLOW_ERROR"}

        _log.info(
            "final_decision",
            decision=final_state.get("decision", ""),
            confidence=final_state.get("confidence", 0.0),
        )

        return Msg(
            name=self.name,
            role="assistant",
            content={
                "alert_id": final_state["alert_id"],
                "org_id": final_state["org_id"],
                "decision": final_state["decision"],
                "confidence": final_state["confidence"],
                "severity": final_state["severity"],
                "attack_type": final_state["attack_type"],
                "reasoning": final_state["reasoning"],
                "osint_results": final_state["osint_results"],
                "consequence_prediction": final_state["consequence_prediction"],
                "tool_calls": final_state["tool_calls"],
            },
        )
