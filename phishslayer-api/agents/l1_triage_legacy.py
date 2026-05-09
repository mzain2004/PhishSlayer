
"""
l1_triage.py — L1 triage agent.
Adversarial reasoning: red hat (attacker view) → blue hat (defender view)
→ consequence gate → TriageResult.
One Groq call per hat. Third call = consequence evaluation.
Clean context: receives AlertPayload only. Returns TriageResult JSON only.
"""

import os
import json
from groq import Groq
from dataclasses import dataclass, asdict
from typing import Optional
from harness.lifecycle_hooks import LifecycleHooks, GateDecision, ALWAYS_REQUIRE_HUMAN
from harness.verify_interface import VerifyInterface
from harness.state_store import StateStore


@dataclass
class TriageResult:
    """
    Structured output of L1 triage. Passed as JSON to L2.
    Never pass raw alert or conversation history forward.
    """
    alert_id: str
    org_id: str

    # Red hat findings
    attacker_intent: str
    mitre_techniques: list
    likely_next_move: str
    is_decoy_or_distraction: bool

    # Blue hat findings
    is_real_threat: bool
    confidence: float
    immediate_actions: list
    indicators_to_watch: list

    # Consequence gate
    escalate_to_l2: bool
    requires_human_approval: bool
    escalation_reason: Optional[str]
    verdict: str    # "escalate"|"monitor"|"close"|"human_required"


class L1TriageAgent:
    """
    L1 triage. 3 Groq calls per alert.
    Call 1: red hat — attacker perspective + MITRE mapping.
    Call 2: blue hat — defense plan informed by attacker view.
    Call 3: consequence evaluation via LifecycleHooks.
    """

    MODEL = "llama-3.3-70b-versatile"
    MAX_TOKENS = 1024

    def __init__(self, lifecycle_hooks: LifecycleHooks, verify: VerifyInterface, state_store: Optional[StateStore] = None):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            self.groq = None
        else:
            self.groq = Groq(api_key=api_key)
        self.hooks = lifecycle_hooks
        self.verify = verify
        self.state_store = state_store

    async def triage(self, alert_id: str, org_id: str, raw_alert: dict) -> TriageResult:
        """
        Main entry. Runs full 3-call chain.
        Returns TriageResult. Never raises — catches and returns safe fallback.
        """
        if not self.groq:
            return self._safe_fallback(alert_id, org_id, "GROQ_API_KEY missing")
        
        session_id = None
        try:
            session_id = self.verify.start_session(alert_id, name="l1_triage")
            red_findings = self._red_hat(alert_id, raw_alert)
            blue_findings = self._blue_hat(alert_id, raw_alert, red_findings)
            result = self._build_result(alert_id, org_id, red_findings, blue_findings)
            self.verify.log_agent_action(session_id, "l1_triage", asdict(result))
            
            # Persist to MongoDB
            if self.state_store:
                await self.state_store.save(alert_id, "l1", asdict(result), org_id)

            outcome = "Success" if result.escalate_to_l2 else "Success" # Still success if closed
            self.verify.end_session(session_id, outcome)
            return result
        except Exception as e:
            if session_id:
                self.verify.end_session(session_id, "Fail")
            return self._safe_fallback(alert_id, org_id, str(e))

    def _red_hat(self, alert_id: str, raw_alert: dict) -> dict:
        """Call 1: attacker perspective. Returns structured dict."""
        prompt = f"""You are an expert red team operator analyzing a security alert.
Think like the attacker who caused this alert.

Alert data:
{json.dumps(raw_alert, indent=2)}

Return ONLY valid JSON — no preamble, no markdown fences, no explanation:
{{
  "attacker_intent": "<what attacker was trying to achieve>",
  "mitre_techniques": ["T1234", "T5678"],
  "likely_next_move": "<what attacker does next if undetected>",
  "is_decoy_or_distraction": false,
  "reasoning": "<brief chain of thought>"
}}"""

        response = self.groq.chat.completions.create(
            model=self.MODEL,
            max_tokens=self.MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.choices[0].message.content.strip()
        return self._parse_json_safe(raw, "red_hat", alert_id)

    def _blue_hat(self, alert_id: str, raw_alert: dict, red_findings: dict) -> dict:
        """
        Call 2: defender perspective informed by red hat.
        Receives red_findings dict only — NOT full conversation history.
        """
        prompt = f"""You are a senior SOC analyst. A red team operator analyzed
this alert. Use their attacker perspective to improve your defense analysis.

Original alert:
{json.dumps(raw_alert, indent=2)}

Red team analysis:
{json.dumps(red_findings, indent=2)}

Return ONLY valid JSON — no preamble, no markdown fences, no explanation:
{{
  "is_real_threat": true,
  "confidence": 0.85,
  "immediate_actions": ["action1", "action2"],
  "indicators_to_watch": ["ioc1", "ioc2"],
  "proposed_actions": ["check_adjacent_hosts", "block_ip"],
  "reasoning": "<brief chain of thought>"
}}

RULES:
- confidence must reflect genuine uncertainty (0.0-1.0)
- proposed_actions = action names only
- If red team shows decoy indicators, lower confidence
- Never include credentials or PII in output"""

        response = self.groq.chat.completions.create(
            model=self.MODEL,
            max_tokens=self.MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.choices[0].message.content.strip()
        return self._parse_json_safe(raw, "blue_hat", alert_id)

    def _build_result(
        self, alert_id: str, org_id: str, red: dict, blue: dict
    ) -> TriageResult:
        """Runs consequence gate. Determines escalation verdict."""
        confidence = float(blue.get("confidence", 0.5))
        proposed = list(set(
            blue.get("proposed_actions", []) +
            blue.get("immediate_actions", [])
        ))
        needs_human = any(a in ALWAYS_REQUIRE_HUMAN for a in proposed)

        if needs_human:
            verdict = "human_required"
            escalate = True
        elif confidence < 0.4:
            verdict = "monitor"
            escalate = False
        else:
            verdict = "escalate"
            escalate = True

        return TriageResult(
            alert_id=alert_id,
            org_id=org_id,
            attacker_intent=red.get("attacker_intent", "unknown"),
            mitre_techniques=red.get("mitre_techniques", []),
            likely_next_move=red.get("likely_next_move", "unknown"),
            is_decoy_or_distraction=bool(red.get("is_decoy_or_distraction", False)),
            is_real_threat=bool(blue.get("is_real_threat", False)),
            confidence=confidence,
            immediate_actions=blue.get("immediate_actions", []),
            indicators_to_watch=blue.get("indicators_to_watch", []),
            escalate_to_l2=escalate,
            requires_human_approval=needs_human,
            escalation_reason="human approval required" if needs_human else None,
            verdict=verdict,
        )

    def _parse_json_safe(self, raw: str, stage: str, alert_id: str) -> dict:
        """Strip markdown fences, parse JSON. Returns error dict on failure."""
        try:
            clean = raw.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        except Exception:
            return {
                "parse_error": True,
                "stage": stage,
                "alert_id": alert_id,
                "raw": raw[:200]
            }

    def _safe_fallback(self, alert_id: str, org_id: str, error: str) -> TriageResult:
        """Called if any Groq call fails. Escalates to human — never drops alert."""
        return TriageResult(
            alert_id=alert_id,
            org_id=org_id,
            attacker_intent="unknown — triage failed",
            mitre_techniques=[],
            likely_next_move="unknown",
            is_decoy_or_distraction=False,
            is_real_threat=True,
            confidence=0.0,
            immediate_actions=["manual_review"],
            indicators_to_watch=[],
            escalate_to_l2=True,
            requires_human_approval=True,
            escalation_reason=f"L1 triage failed: {error[:100]}",
            verdict="human_required",
        )
