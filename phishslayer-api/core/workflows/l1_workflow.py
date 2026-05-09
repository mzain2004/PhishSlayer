"""
L1 Triage LangGraph state machine.

Flow:
  ingest_alert → classify_alert → check_rag → enrich_osint →
  predict_consequence → compute_confidence → route_decision

route_decision conditional edges:
  confidence >= 0.85 AND severity in {low, medium}  → write_close
  attack_type == 'apt' OR severity == 'critical'     → write_escalate_l3
  otherwise                                          → write_escalate_l2
"""
from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Literal, TypedDict

from groq import Groq
from langgraph.graph import END, StateGraph

from core.harness.consequence_predictor import ConsequencePredictor


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class L1State(TypedDict):
    alert_id: str
    org_id: str
    raw_alert: dict
    severity: str                     # low | medium | high | critical
    attack_type: str                  # phishing | malware | apt | brute_force | other
    source_ip: str
    affected_asset: str
    enrichments: dict
    osint_results: dict
    rag_context: list[dict]
    confidence: float
    decision: str                     # close | escalate_l2 | escalate_l3
    reasoning: str
    tool_calls: list[str]
    openspace_budget_remaining: int   # token budget tracker
    consequence_prediction: dict


# ---------------------------------------------------------------------------
# Groq client (lazy)
# ---------------------------------------------------------------------------

def _groq() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY", ""))


_MODEL = "llama3-70b-8192"


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def ingest_alert(state: L1State) -> L1State:
    """Normalise raw_alert fields into top-level state keys."""
    raw = state.get("raw_alert", {})
    state["source_ip"] = raw.get("source_ip") or raw.get("src_ip", "unknown")
    state["affected_asset"] = raw.get("affected_asset") or raw.get("hostname", "unknown")
    state["severity"] = raw.get("severity", "medium").lower()
    state["attack_type"] = raw.get("attack_type", "other").lower()
    state["enrichments"] = {}
    state["osint_results"] = {}
    state["rag_context"] = []
    state["tool_calls"] = []
    state["confidence"] = 0.0
    state["openspace_budget_remaining"] = 8000
    state["consequence_prediction"] = {}
    return state


def classify_alert(state: L1State) -> L1State:
    """LLM call: refine severity + attack_type. Uses ModelRouter (FAST tier)."""
    system = "You are a security analyst. Classify the alert and return ONLY valid JSON."
    prompt = f"""Classify this security alert. Return ONLY JSON.
Alert: {json.dumps(state["raw_alert"], default=str)}
{{
  "severity": "low|medium|high|critical",
  "attack_type": "phishing|malware|apt|brute_force|other",
  "source_ip": "<ip or unknown>",
  "affected_asset": "<hostname or unknown>",
  "reasoning": "<one sentence>"
}}"""
    try:
        from core.harness.anthropic_client import anthropic_client
        raw = anthropic_client.complete(
            agent_name="l1_triage",
            system_prompt=system,
            user_message=prompt,
            response_format="json",
        )
        data = json.loads(raw)
        state["severity"] = data.get("severity", state["severity"]).lower()
        state["attack_type"] = data.get("attack_type", state["attack_type"]).lower()
        state["source_ip"] = data.get("source_ip", state["source_ip"])
        state["affected_asset"] = data.get("affected_asset", state["affected_asset"])
        state["reasoning"] = data.get("reasoning", "")
        state["tool_calls"].append("classify_alert:model_router:l1_triage")
        state["openspace_budget_remaining"] -= 300
    except Exception:
        # Fallback to Groq
        try:
            resp = _groq().chat.completions.create(
                model=_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1,
                timeout=15,
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            state["severity"] = data.get("severity", state["severity"]).lower()
            state["attack_type"] = data.get("attack_type", state["attack_type"]).lower()
            state["source_ip"] = data.get("source_ip", state["source_ip"])
            state["affected_asset"] = data.get("affected_asset", state["affected_asset"])
            state["reasoning"] = data.get("reasoning", "")
            state["tool_calls"].append("classify_alert:groq_fallback")
            state["openspace_budget_remaining"] -= 300
        except Exception:
            pass
    return state


def check_rag(state: L1State) -> L1State:
    """Query page index RAG for similar past incidents."""
    try:
        from memory.rag.page_index_rag import PageIndexRAG
        rag = PageIndexRAG()
        query = f"{state['attack_type']} {state['source_ip']} {state['affected_asset']}"
        results = rag.query(query, state["org_id"])
        state["rag_context"] = results
        state["tool_calls"].append(f"check_rag:{len(results)}_results")
    except Exception:
        state["rag_context"] = []
    return state


def _fetch_vt(ip: str) -> dict:
    from tools.osint.virustotal_tool import vt_check_ip
    return vt_check_ip(ip)


def _fetch_abuseipdb(ip: str) -> dict:
    from tools.osint.abuseipdb_tool import abuseipdb_check
    return abuseipdb_check(ip)


def _fetch_urlscan(url: str) -> dict:
    from tools.osint.urlscan_tool import urlscan_submit
    return urlscan_submit(url)


def _fetch_scrapling(domain: str) -> dict:
    from tools.osint.scrapling_tool import scrapling_fetch
    return scrapling_fetch(f"https://www.whois.com/whois/{domain}")


def enrich_osint(state: L1State) -> L1State:
    """Run OSINT tools in parallel via ThreadPoolExecutor."""
    ip = state["source_ip"]
    raw = state.get("raw_alert", {})
    url = raw.get("url") or raw.get("target_url")
    domain = ip if not ip.replace(".", "").isdigit() else raw.get("domain", "")

    tasks: dict[str, any] = {"vt": (_fetch_vt, ip), "abuse": (_fetch_abuseipdb, ip)}
    if domain:
        tasks["scrapling"] = (_fetch_scrapling, domain)
    if url:
        tasks["urlscan"] = (_fetch_urlscan, url)

    results: dict = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fn, arg): key for key, (fn, arg) in tasks.items()}
        for future in as_completed(futures, timeout=12):
            key = futures[future]
            try:
                results[key] = future.result()
                state["tool_calls"].append(f"osint:{key}")
            except Exception:
                results[key] = {"status": "error", "error": "TOOL_TIMEOUT"}

    state["osint_results"] = results
    return state


def predict_consequence(state: L1State) -> L1State:
    """Run consequence predictor for potential 'block_ip' action."""
    try:
        predictor = ConsequencePredictor()
        action = f"block_ip:{state['source_ip']}"
        model = predictor.predict(action, {
            "severity": state["severity"],
            "attack_type": state["attack_type"],
            "affected_asset": state["affected_asset"],
        })
        state["consequence_prediction"] = model.model_dump()
        state["tool_calls"].append("consequence_predictor")
    except Exception:
        state["consequence_prediction"] = {}
    return state


def compute_confidence(state: L1State) -> L1State:
    """Aggregate OSINT signals + RAG context + LLM into a confidence score."""
    score = 0.5

    # OSINT signals
    vt = state["osint_results"].get("vt", {})
    abuse = state["osint_results"].get("abuse", {})
    if vt.get("malicious", 0) > 3:
        score += 0.2
    if abuse.get("abuse_confidence_score", 0) > 50:
        score += 0.15
    if state["rag_context"]:
        score += 0.1

    # Severity weight
    severity_boost = {"low": -0.1, "medium": 0.0, "high": 0.1, "critical": 0.2}
    score += severity_boost.get(state["severity"], 0.0)

    # Consequence predictor FP penalty
    cp = state.get("consequence_prediction", {})
    if cp:
        score -= cp.get("false_positive_probability", 0.0) * 0.2

    state["confidence"] = round(max(0.0, min(1.0, score)), 3)
    return state


def route_decision(state: L1State) -> L1State:
    """Determine decision string. Actual routing handled by conditional edge."""
    sev = state["severity"]
    att = state["attack_type"]
    conf = state["confidence"]

    if att == "apt" or sev == "critical":
        state["decision"] = "escalate_l3"
    elif conf >= 0.85 and sev in ("low", "medium"):
        state["decision"] = "close"
    else:
        state["decision"] = "escalate_l2"

    state["reasoning"] = (
        f"decision={state['decision']} confidence={state['confidence']:.2f} "
        f"severity={sev} attack_type={att}"
    )
    return state


def write_close(state: L1State) -> L1State:
    state["decision"] = "close"
    return state


def write_escalate_l2(state: L1State) -> L1State:
    state["decision"] = "escalate_l2"
    return state


def write_escalate_l3(state: L1State) -> L1State:
    state["decision"] = "escalate_l3"
    return state


# ---------------------------------------------------------------------------
# Conditional edge function
# ---------------------------------------------------------------------------

def _route(state: L1State) -> Literal["write_close", "write_escalate_l2", "write_escalate_l3"]:
    return state["decision"].replace("escalate_", "write_escalate_").replace("close", "write_close")  # type: ignore


# ---------------------------------------------------------------------------
# Graph compilation
# ---------------------------------------------------------------------------

def build_l1_workflow():
    g = StateGraph(L1State)

    for node_fn in (
        ingest_alert, classify_alert, check_rag, enrich_osint,
        predict_consequence, compute_confidence, route_decision,
        write_close, write_escalate_l2, write_escalate_l3,
    ):
        g.add_node(node_fn.__name__, node_fn)

    g.set_entry_point("ingest_alert")
    g.add_edge("ingest_alert", "classify_alert")
    g.add_edge("classify_alert", "check_rag")
    g.add_edge("check_rag", "enrich_osint")
    g.add_edge("enrich_osint", "predict_consequence")
    g.add_edge("predict_consequence", "compute_confidence")
    g.add_edge("compute_confidence", "route_decision")

    g.add_conditional_edges(
        "route_decision",
        _route,
        {
            "write_close": "write_close",
            "write_escalate_l2": "write_escalate_l2",
            "write_escalate_l3": "write_escalate_l3",
        },
    )
    g.add_edge("write_close", END)
    g.add_edge("write_escalate_l2", END)
    g.add_edge("write_escalate_l3", END)

    return g.compile()


# Module-level compiled graph (lazy init on first use)
_workflow = None


def get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = build_l1_workflow()
    return _workflow
