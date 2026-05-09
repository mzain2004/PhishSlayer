"""
l2_workflow.py — L2 Responder LangGraph state machine.

Flow:
  load_l1_context → identity_analysis → cross_correlate →
  build_response_plan → run_consequence_models → confidence_gate →
  execute_actions → record_outcomes → notify_dashboard

confidence_gate conditional edges:
  ALL actions confidence >= threshold AND blast_radius NOT IN (org, tenant)
    → execute_actions
  ANY action confidence < threshold OR blast_radius IN (org, tenant)
    → queue_for_human
"""
from __future__ import annotations

import json
import logging
import os
from typing import Literal, TypedDict, Optional

from groq import Groq
from langgraph.graph import END, StateGraph

log = logging.getLogger(__name__)

EXECUTION_THRESHOLD = float(os.getenv("L2_EXECUTION_THRESHOLD", "0.85"))
BLAST_RADIUS_BLOCKS = {"org", "tenant"}


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class L2State(TypedDict):
    # From L1
    alert_id: str
    org_id: str
    raw_alert: dict
    severity: str
    attack_type: str
    source_ip: str
    affected_asset: str
    l1_decision: str
    l1_confidence: float

    # L2-specific
    l1_context: dict               # structured L1 TriageResult
    historical_patterns: list      # similar past incidents from pgvector
    user_risk_score: float
    proposed_actions: list[dict]   # [{name, params, target}]
    consequence_models: list[dict] # ConsequenceModel.model_dump() per action
    approved_actions: list[dict]   # passed gate — auto-execute
    executed_actions: list[dict]
    execution_results: list[dict]
    human_queue: list[dict]        # blocked — await approval
    final_confidence: float
    verdict: str                   # escalate | contain | close | human_required
    reasoning: str


# ---------------------------------------------------------------------------
# Groq client
# ---------------------------------------------------------------------------

def _groq() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY", ""))


_MODEL = "llama3-70b-8192"


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def load_l1_context(state: L2State) -> L2State:
    """Load L1 triage result from state. No LLM call needed."""
    ctx = state.get("l1_context", {})
    state["severity"] = ctx.get("severity", state.get("severity", "medium"))
    state["attack_type"] = ctx.get("attack_type", state.get("attack_type", "other"))
    state["source_ip"] = ctx.get("source_ip", state.get("source_ip", "unknown"))
    state["affected_asset"] = ctx.get("affected_asset", state.get("affected_asset", "unknown"))
    state["historical_patterns"] = []
    state["user_risk_score"] = 0.5
    state["proposed_actions"] = []
    state["consequence_models"] = []
    state["approved_actions"] = []
    state["executed_actions"] = []
    state["execution_results"] = []
    state["human_queue"] = []
    state["final_confidence"] = state.get("l1_confidence", 0.5)
    state["verdict"] = ""
    return state


def identity_analysis(state: L2State) -> L2State:
    """Assess user/device risk from available context. One Groq call."""
    prompt = f"""You are a SOC analyst assessing identity risk.
Alert: source_ip={state['source_ip']}, asset={state['affected_asset']},
attack_type={state['attack_type']}, severity={state['severity']},
l1_context={json.dumps(state.get('l1_context', {}), default=str)[:800]}

Return ONLY JSON:
{{
  "user_risk_score": <0.0-1.0>,
  "risk_factors": ["<factor1>", "<factor2>"],
  "recommended_identity_actions": ["<action1>"]
}}"""
    try:
        resp = _groq().chat.completions.create(
            model=_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
            timeout=15,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        state["user_risk_score"] = float(data.get("user_risk_score", 0.5))
    except Exception as e:
        log.warning("identity_analysis LLM failed: %s", e)
    return state


def cross_correlate(state: L2State) -> L2State:
    """
    Query Supabase pgvector for similar past incidents.
    Gracefully skips if DB unavailable.
    """
    try:
        from core.harness.memory_manager import MemoryManager
        mm = MemoryManager()
        state["historical_patterns"] = mm.find_similar(
            state["alert_id"], state["org_id"],
            attack_type=state["attack_type"],
            severity=state["severity"],
        )
    except Exception as e:
        log.warning("cross_correlate skipped: %s", e)
        state["historical_patterns"] = []
    return state


def build_response_plan(state: L2State) -> L2State:
    """LLM generates proposed response actions based on L1 + identity context."""
    hist_summary = [
        {"decision": p.get("decision"), "confidence": p.get("confidence_score")}
        for p in state["historical_patterns"][:3]
    ]
    prompt = f"""You are a SOC incident responder.
Attack: {state['attack_type']}, severity: {state['severity']},
source_ip: {state['source_ip']}, asset: {state['affected_asset']},
user_risk_score: {state['user_risk_score']:.2f},
historical_patterns: {json.dumps(hist_summary, default=str)},
l1_confidence: {state['l1_confidence']:.2f}

Propose up to 3 targeted response actions. Each action must specify blast_radius.
Available actions: graph_revoke_session, graph_disable_account, graph_reset_mfa,
wazuh_active_response (block_ip, isolate_host)

Return ONLY JSON:
{{
  "proposed_actions": [
    {{
      "name": "<action_name>",
      "target": "<user_id|agent_id|ip>",
      "params": {{}},
      "blast_radius": "<user|device|org|tenant>",
      "rationale": "<one sentence>"
    }}
  ],
  "reasoning": "<overall plan reasoning>"
}}"""
    try:
        resp = _groq().chat.completions.create(
            model=_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.15,
            timeout=20,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        state["proposed_actions"] = data.get("proposed_actions", [])
        state["reasoning"] = data.get("reasoning", "")
    except Exception as e:
        log.warning("build_response_plan LLM failed: %s", e)
        state["proposed_actions"] = []
    return state


def run_consequence_models(state: L2State) -> L2State:
    """Run ConsequencePredictor for each proposed action."""
    try:
        from core.harness.consequence_predictor import ConsequencePredictor
        predictor = ConsequencePredictor()
        models = []
        for action in state["proposed_actions"]:
            try:
                model = predictor.predict(action["name"], {
                    "target": action.get("target", ""),
                    "severity": state["severity"],
                    "blast_radius": action.get("blast_radius", "user"),
                    "org_id": state["org_id"],
                })
                models.append({**action, "consequence": model.model_dump()})
            except Exception as e:
                log.warning("consequence_predictor failed for %s: %s", action["name"], e)
                models.append({**action, "consequence": {"confidence": 0.0, "blast_radius": action.get("blast_radius", "org")}})
        state["consequence_models"] = models
    except Exception as e:
        log.warning("run_consequence_models skipped: %s", e)
        state["consequence_models"] = [
            {**a, "consequence": {"confidence": 0.0, "blast_radius": a.get("blast_radius", "org")}}
            for a in state["proposed_actions"]
        ]
    return state


def confidence_gate(state: L2State) -> L2State:
    """
    Gate: separate consequence_models into approved vs. human_queue.
    Sets state["verdict"] for conditional routing.
    """
    approved = []
    blocked = []

    for cm in state["consequence_models"]:
        cons = cm.get("consequence", {})
        confidence = float(cons.get("confidence", 0.0))
        blast = cons.get("blast_radius", "org")

        if confidence >= EXECUTION_THRESHOLD and blast not in BLAST_RADIUS_BLOCKS:
            approved.append(cm)
        else:
            blocked.append(cm)

    state["approved_actions"] = approved
    state["human_queue"] = blocked

    if blocked:
        state["verdict"] = "human_required"
    elif approved:
        state["verdict"] = "execute"
    else:
        state["verdict"] = "close"

    return state


def _route_gate(state: L2State) -> Literal["execute_actions", "queue_for_human", "write_close"]:
    v = state.get("verdict", "close")
    if v == "execute":
        return "execute_actions"
    elif v == "human_required":
        return "queue_for_human"
    return "write_close"


def execute_actions(state: L2State) -> L2State:
    """Execute approved low-blast-radius actions."""
    results = []
    for action in state["approved_actions"]:
        try:
            result = _dispatch_action(action, state["org_id"])
            results.append({"action": action["name"], "result": result, "status": "executed"})
        except Exception as e:
            log.error("execute_actions failed for %s: %s", action.get("name"), e)
            results.append({"action": action.get("name"), "error": "EXEC_FAILED", "status": "failed"})
    state["executed_actions"] = state["approved_actions"]
    state["execution_results"] = results
    state["verdict"] = "contain"
    return state


def queue_for_human(state: L2State) -> L2State:
    """Persist human_queue to Supabase pending_actions table."""
    try:
        from core.harness.memory_manager import MemoryManager
        mm = MemoryManager()
        for action in state["human_queue"]:
            mm.queue_pending_action(
                alert_id=state["alert_id"],
                org_id=state["org_id"],
                action=action,
            )
    except Exception as e:
        log.warning("queue_for_human persistence failed: %s", e)
    state["verdict"] = "human_required"
    return state


def record_outcomes(state: L2State) -> L2State:
    """Persist execution results to Supabase agent_reasoning."""
    try:
        from core.harness.memory_manager import MemoryManager
        mm = MemoryManager()
        mm.save_l2_outcome(
            alert_id=state["alert_id"],
            org_id=state["org_id"],
            verdict=state["verdict"],
            executed=state["executed_actions"],
            results=state["execution_results"],
            confidence=state["final_confidence"],
        )
    except Exception as e:
        log.warning("record_outcomes failed: %s", e)
    return state


def notify_dashboard(state: L2State) -> L2State:
    """Publish SSE event to Redis pub/sub for frontend streaming."""
    try:
        import redis
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
        payload = json.dumps({
            "type": "l2_complete",
            "alert_id": state["alert_id"],
            "verdict": state["verdict"],
            "executed": len(state["executed_actions"]),
            "pending_human": len(state["human_queue"]),
        })
        r.publish(f"agent-trace:{state['alert_id']}", payload)
    except Exception as e:
        log.warning("notify_dashboard failed: %s", e)
    return state


def write_close(state: L2State) -> L2State:
    state["verdict"] = "close"
    return state


# ---------------------------------------------------------------------------
# Action dispatcher
# ---------------------------------------------------------------------------

def _dispatch_action(action: dict, org_id: str) -> dict:
    name = action.get("name", "")
    params = action.get("params", {})
    target = action.get("target", "")

    if name == "graph_revoke_session":
        from tools.identity.graph_tool import graph_revoke_session
        return graph_revoke_session(target, org_id)
    elif name == "graph_disable_account":
        from tools.identity.graph_tool import graph_disable_account
        return graph_disable_account(target, org_id)
    elif name == "graph_reset_mfa":
        from tools.identity.graph_tool import graph_reset_mfa
        return graph_reset_mfa(target, org_id)
    elif name == "wazuh_active_response":
        from tools.edr.wazuh_tool import wazuh_active_response
        return wazuh_active_response(target, params.get("command", "block"), org_id)
    else:
        raise ValueError(f"Unknown action: {name}")


# ---------------------------------------------------------------------------
# Graph compilation
# ---------------------------------------------------------------------------

def build_l2_workflow():
    g = StateGraph(L2State)

    for fn in (
        load_l1_context, identity_analysis, cross_correlate,
        build_response_plan, run_consequence_models, confidence_gate,
        execute_actions, queue_for_human, record_outcomes,
        notify_dashboard, write_close,
    ):
        g.add_node(fn.__name__, fn)

    g.set_entry_point("load_l1_context")
    g.add_edge("load_l1_context", "identity_analysis")
    g.add_edge("identity_analysis", "cross_correlate")
    g.add_edge("cross_correlate", "build_response_plan")
    g.add_edge("build_response_plan", "run_consequence_models")
    g.add_edge("run_consequence_models", "confidence_gate")

    g.add_conditional_edges(
        "confidence_gate",
        _route_gate,
        {
            "execute_actions": "execute_actions",
            "queue_for_human": "queue_for_human",
            "write_close": "write_close",
        },
    )

    g.add_edge("execute_actions", "record_outcomes")
    g.add_edge("queue_for_human", "notify_dashboard")
    g.add_edge("record_outcomes", "notify_dashboard")
    g.add_edge("notify_dashboard", END)
    g.add_edge("write_close", END)

    return g.compile()


_workflow = None


def get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = build_l2_workflow()
    return _workflow
