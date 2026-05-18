
"""
l2_investigator.py — L2 investigator agent.
Receives L1 TriageResult JSON only — never raw alert or conversation history.
3-step flow: OPPLAN generation → red hat pivot → blue hat response + critic.
Consequence gate on every proposed action before returning.
Phase 4 implementation.
"""

import os
import json
from groq import Groq
from dataclasses import dataclass, asdict, field
from typing import Optional
from harness.lifecycle_hooks import LifecycleHooks, GateDecision, ALWAYS_REQUIRE_HUMAN
from harness.verify_interface import VerifyInterface
from harness.state_store import StateStore
from agents.l1_triage import TriageResult


@dataclass
class IncidentOPPLAN:
    """
    Incident plan generated before L2 acts.
    Decepticon Soundwave pattern: plan before action.
    """
    alert_id: str
    objective: str
    attacker_hypothesis: str
    investigation_steps: list[str]
    data_sources_to_query: list[str]
    success_criteria: str


@dataclass
class InvestigationResult:
    """Structured output of L2 investigation. Passed as JSON to L3."""
    alert_id: str
    org_id: str
    opplan: dict
    confirmed_threat: bool
    confidence: float
    attacker_pivot_analysis: str
    evidence_gathered: list[str]
    proposed_actions: list[str]
    approved_actions: list[str]          # passed gate — auto-execute
    human_required_actions: list[str]    # blocked — need approval
    blocked_actions: list[str]           # gate rejected entirely
    escalate_to_l3: bool
    requires_human_approval: bool
    verdict: str    # "escalate"|"contain"|"close"|"human_required"
    diamond_model: dict = field(default_factory=dict)


class L2InvestigatorAgent:
    """
    L2 investigation. Receives L1 findings JSON only.
    Step 1: generate OPPLAN (plan before action).
    Step 2: red hat pivot — attacker next move given L1 findings.
    Step 3: blue hat + critic — response + consequence gate on every action.
    """

    MODEL = "llama-3.3-70b-versatile"
    MAX_TOKENS = 1500

    def __init__(self, lifecycle_hooks: LifecycleHooks, verify: VerifyInterface, state_store: Optional[StateStore] = None):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            self.groq = None
        else:
            self.groq = Groq(api_key=api_key)
        self.hooks = lifecycle_hooks
        self.verify = verify
        self.state_store = state_store

    async def investigate(self, l1_result: TriageResult, org_scope: dict = None) -> InvestigationResult:
        """
        Main entry. Takes L1 TriageResult, returns InvestigationResult.
        Never raises — safe fallback on any Groq failure.
        """
        if not self.groq:
            return self._safe_fallback(l1_result.alert_id, l1_result.org_id, "GROQ_API_KEY missing")

        org_scope = org_scope or {"max_blast_radius": "medium"}
        session_id = self.verify.start_session(l1_result.alert_id, name="l2_investigator")
        try:
            l1_json = asdict(l1_result)
            opplan = self._generate_opplan(l1_json)
            red_pivot = self._red_hat_pivot(l1_json, asdict(opplan))
            blue_response = self._blue_hat_response(l1_json, asdict(opplan), red_pivot)
            diamond = self._diamond_analysis(l1_json, asdict(opplan), red_pivot, blue_response)
            result = self._apply_consequence_gates(
                l1_result.alert_id, l1_result.org_id,
                opplan, blue_response, org_scope
            )
            result.diamond_model = diamond
            self.verify.log_agent_action(session_id, "l2_investigator", asdict(result))

            # Persist to MongoDB
            if self.state_store:
                await self.state_store.save(l1_result.alert_id, "l2", asdict(result), l1_result.org_id)

            self.verify.end_session(session_id, "Success")
            return result
        except Exception as e:
            self.verify.end_session(session_id, "Fail")
            return self._safe_fallback(l1_result.alert_id, l1_result.org_id, str(e))

    def _generate_opplan(self, l1_json: dict) -> IncidentOPPLAN:
        """
        Step 1: OPPLAN — plan before acting.
        Returns structured investigation plan.
        """
        prompt = f"""You are a senior incident responder creating an investigation plan.
Based on L1 triage findings, generate a focused investigation plan.

L1 Triage Findings:
{json.dumps(l1_json, indent=2)}

Return ONLY valid JSON — no preamble, no markdown:
{{
  "objective": "<one sentence — what we are investigating>",
  "attacker_hypothesis": "<most likely attacker scenario based on L1>",
  "investigation_steps": ["<step1>", "<step2>", "<step3>"],
  "data_sources_to_query": ["<wazuh_logs>", "<netflow>", "<dns_logs>"],
  "success_criteria": "<what evidence confirms or denies the threat>"
}}

Keep investigation_steps to max 5. Be specific to the alert, not generic."""

        response = self.groq.chat.completions.create(
            model=self.MODEL, max_tokens=self.MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = self._parse_json_safe(response.choices[0].message.content, "opplan")
        return IncidentOPPLAN(
            alert_id=l1_json.get("alert_id", "unknown"),
            objective=raw.get("objective", "unknown"),
            attacker_hypothesis=raw.get("attacker_hypothesis", "unknown"),
            investigation_steps=raw.get("investigation_steps", []),
            data_sources_to_query=raw.get("data_sources_to_query", []),
            success_criteria=raw.get("success_criteria", "unknown"),
        )

    def _red_hat_pivot(self, l1_json: dict, opplan: dict) -> dict:
        """
        Step 2: attacker pivot — given L1 findings + OPPLAN,
        where does attacker go next? What are they after?
        """
        prompt = f"""You are a red team operator. L1 triage identified initial activity.
Now think: given this attacker is still active, what is their next move?

L1 Findings:
{json.dumps(l1_json, indent=2)}

Investigation Plan:
{json.dumps(opplan, indent=2)}

Return ONLY valid JSON:
{{
  "next_attack_vector": "<where attacker pivots next>",
  "target_assets": ["<asset1>", "<asset2>"],
  "timeframe": "<how soon — immediate/hours/days>",
  "evasion_technique": "<how attacker avoids detection>",
  "blast_radius": "low|medium|high",
  "confidence": <0.0 to 1.0>
}}"""

        response = self.groq.chat.completions.create(
            model=self.MODEL, max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return self._parse_json_safe(response.choices[0].message.content, "red_pivot")

    def _blue_hat_response(self, l1_json: dict, opplan: dict, red_pivot: dict) -> dict:
        """
        Step 3: blue hat + critic.
        Proposes response actions informed by both OPPLAN and red pivot.
        Critic reviews blast radius before returning.
        """
        prompt = f"""You are a SOC analyst + incident commander.
You have L1 findings, an investigation plan, and red team pivot analysis.
Propose containment and investigation actions.

L1 Findings:
{json.dumps(l1_json, indent=2)}

OPPLAN:
{json.dumps(opplan, indent=2)}

Red Team Pivot Analysis:
{json.dumps(red_pivot, indent=2)}

CRITIC ROLE — before proposing each action, ask:
  1. What breaks if this action fails?
  2. Is it reversible?
  3. What is the blast radius?

Return ONLY valid JSON:
{{
  "confirmed_threat": <true|false>,
  "confidence": <0.0 to 1.0>,
  "evidence_gathered": ["<evidence1>", "<evidence2>"],
  "proposed_actions": [
    {{
      "action": "<action_name>",
      "rationale": "<why>",
      "blast_radius": "low|medium|high",
      "reversible": <true|false>
    }}
  ],
  "attacker_pivot_analysis": "<summary of red team pivot findings>",
  "verdict": "escalate|contain|close|human_required"
}}

action names must be exact: block_ip, isolate_host, check_adjacent_hosts,
pull_memory_dump, check_outbound_traffic, check_dns_logs, disable_account,
quarantine_file, add_watchlist, close_false_positive"""

        response = self.groq.chat.completions.create(
            model=self.MODEL, max_tokens=self.MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        return self._parse_json_safe(response.choices[0].message.content, "blue_response")

    def _diamond_analysis(self, l1_json: dict, opplan: dict, red_pivot: dict, blue_response: dict) -> dict:
        """
        Diamond Model of Intrusion Analysis.
        Maps the incident across 4 axes: Adversary, Capability, Infrastructure, Victim.
        DO NOT modify the existing OPPLAN/red/blue logic — this runs alongside them.
        """
        prompt = f"""You are a threat intelligence analyst applying the Diamond Model of Intrusion Analysis.
Map this incident across the 4 Diamond Model axes. Do NOT repeat OPPLAN steps — focus on attribution context.

The Diamond Model axes:
  Adversary   — who is attacking (identity, motivation, sophistication)
  Capability  — what tools, techniques, malware they employed
  Infrastructure — C2 servers, hosting, domains, relay points
  Victim      — who was targeted, why them, what assets at risk

L1 Findings: {json.dumps(l1_json, indent=2)}
OPPLAN: {json.dumps(opplan, indent=2)}
Red Team Pivot: {json.dumps(red_pivot, indent=2)}
Blue Response: {json.dumps(blue_response, indent=2)}

Return ONLY valid JSON:
{{
  "adversary": {{
    "identity": "<nation-state|criminal|insider|unknown>",
    "motivation": "<financial|espionage|disruption|unknown>",
    "sophistication": "<low|medium|high|apt>"
  }},
  "capability": {{
    "tools": ["<tool1>"],
    "techniques": ["<T1234>"],
    "malware_suspected": "<name or none>"
  }},
  "infrastructure": {{
    "c2_indicators": ["<ip or domain>"],
    "hosting_type": "<datacenter|residential|tor|unknown>",
    "infrastructure_reuse": "<likely|unlikely|unknown>"
  }},
  "victim": {{
    "targeting": "<opportunistic|targeted>",
    "assets_at_risk": ["<asset1>"],
    "crown_jewels_proximity": "<low|medium|high>"
  }},
  "meta_feature": "<key activity linking all 4 axes in one sentence>"
}}"""

        response = self.groq.chat.completions.create(
            model=self.MODEL, max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        return self._parse_json_safe(response.choices[0].message.content, "diamond")

    def _apply_consequence_gates(
        self, alert_id: str, org_id: str,
        opplan: IncidentOPPLAN, blue: dict, org_scope: dict
    ) -> InvestigationResult:
        """Run each proposed action through all 3 gates."""
        approved, human_required, blocked = [], [], []
        proposed_actions = []

        for action_obj in blue.get("proposed_actions", []):
            action = action_obj.get("action", "")
            proposed_actions.append(action)
            blast = action_obj.get("blast_radius", "low")
            confidence = float(blue.get("confidence", 0.5))

            report = self.hooks.evaluate(
                action=action,
                confidence=confidence,
                context={"blast_radius": blast, "org_scope": org_scope}
            )

            if report.gate_decision.value == "proceed":
                approved.append(action)
            elif report.gate_decision.value == "require_human":
                human_required.append(action)
            else:
                blocked.append(action)

        needs_human = len(human_required) > 0
        verdict = blue.get("verdict", "escalate")
        if needs_human:
            verdict = "human_required"

        return InvestigationResult(
            alert_id=alert_id,
            org_id=org_id,
            opplan=asdict(opplan),
            confirmed_threat=bool(blue.get("confirmed_threat", False)),
            confidence=float(blue.get("confidence", 0.5)),
            attacker_pivot_analysis=blue.get("attacker_pivot_analysis", ""),
            evidence_gathered=blue.get("evidence_gathered", []),
            proposed_actions=proposed_actions,
            approved_actions=approved,
            human_required_actions=human_required,
            blocked_actions=blocked,
            escalate_to_l3=(verdict == "escalate"),
            requires_human_approval=needs_human,
            verdict=verdict,
        )

    def _parse_json_safe(self, raw: str, stage: str) -> dict:
        try:
            clean = raw.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        except Exception:
            return {"parse_error": True, "stage": stage, "raw": raw[:200]}

    def _safe_fallback(self, alert_id: str, org_id: str, error: str) -> InvestigationResult:
        from agents.l1_triage import TriageResult
        from dataclasses import fields
        empty_opplan = IncidentOPPLAN(
            alert_id=alert_id, objective="unknown",
            attacker_hypothesis="unknown", investigation_steps=[],
            data_sources_to_query=[], success_criteria="unknown"
        )
        return InvestigationResult(
            alert_id=alert_id, org_id=org_id,
            opplan=asdict(empty_opplan),
            confirmed_threat=True,
            confidence=0.0,
            attacker_pivot_analysis="L2 failed",
            evidence_gathered=[],
            proposed_actions=["manual_review"],
            approved_actions=[],
            human_required_actions=["manual_review"],
            blocked_actions=[],
            escalate_to_l3=False,
            requires_human_approval=True,
            verdict="human_required",
        )
