"""
report_generator.py — 3-tier intelligence report generation.
Tactical (SOC engineers), Operational (managers), Strategic (CISO/board).
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Literal

from groq import Groq

logger = logging.getLogger(__name__)

ReportType = Literal["tactical", "operational", "strategic"]

_TACTICAL_PROMPT = """You are a SOC analyst writing a tactical incident report for fellow security engineers.
Focus on: IOCs to block, MITRE techniques, log sources, immediate remediation steps.

Hunt Findings:
{findings_json}

Return ONLY valid JSON:
{{
  "report_type": "tactical",
  "executive_summary": "<2 sentences — what happened technically>",
  "iocs_to_block": ["<ip|domain|hash>"],
  "mitre_coverage": ["<T1234 - Technique Name>"],
  "log_sources_to_query": ["<wazuh|dns|netflow|edr>"],
  "immediate_actions": ["<action1>", "<action2>"],
  "detection_gaps": ["<gap1>"],
  "false_positive_risk": "<low|medium|high>",
  "severity": "<critical|high|medium|low>"
}}"""

_OPERATIONAL_PROMPT = """You are an incident commander writing an operational report for security managers.
Focus on: what happened, business impact, timeline, actions taken vs pending.

Hunt Findings:
{findings_json}

Return ONLY valid JSON:
{{
  "report_type": "operational",
  "executive_summary": "<3 sentences — incident overview for management>",
  "business_impact": "<actual or potential business impact>",
  "timeline": [
    {{"event": "<event>", "time_offset": "<e.g. T+0h>"}},
    {{"event": "<event>", "time_offset": "<e.g. T+1h>"}}
  ],
  "actions_completed": ["<action1>"],
  "actions_pending": ["<action1>"],
  "containment_status": "<contained|partially_contained|uncontained>",
  "estimated_recovery_time": "<hours|days>",
  "escalation_needed": <true|false>
}}"""

_STRATEGIC_PROMPT = """You are a CISO writing a strategic threat report for senior leadership and the board.
Focus on: risk posture, threat trends, compliance implications, recommended investments.

Hunt Findings:
{findings_json}

Return ONLY valid JSON:
{{
  "report_type": "strategic",
  "executive_summary": "<3 sentences — risk framing for board>",
  "risk_rating": "<critical|high|medium|low>",
  "threat_actor_assessment": "<nation-state|criminal|hacktivist|insider|unknown>",
  "compliance_implications": ["<GDPR>", "<SOC2>", "<ISO27001>"],
  "recommended_investments": ["<security control or tool>"],
  "risk_trend": "<increasing|stable|decreasing>",
  "peer_industry_context": "<how this threat compares to industry baseline>",
  "board_action_items": ["<action for board>"]
}}"""

_PROMPTS: dict[str, str] = {
    "tactical": _TACTICAL_PROMPT,
    "operational": _OPERATIONAL_PROMPT,
    "strategic": _STRATEGIC_PROMPT,
}


class ReportGenerator:
    """
    Generates 3-tier intelligence reports from L3 HuntResult.
    Never raises — returns fallback report on any failure.
    """

    MODEL = "llama-3.3-70b-versatile"
    MAX_TOKENS = 2000

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        self.groq = Groq(api_key=api_key) if api_key else None
        if not self.groq:
            logger.warning("GROQ_API_KEY not set — report generation disabled")

    async def generate(self, hunt_result: dict, report_type: str, org_id: str) -> dict:
        """
        Generate a report.
        report_type: tactical | operational | strategic
        Never raises.
        """
        if report_type not in _PROMPTS:
            report_type = "tactical"

        if not self.groq:
            return self._fallback_report(hunt_result, report_type, org_id)

        try:
            findings_json = json.dumps({
                "alert_id": hunt_result.get("alert_id"),
                "final_verdict": hunt_result.get("final_verdict"),
                "confidence": hunt_result.get("confidence"),
                "incident_summary": hunt_result.get("incident_summary"),
                "threat_intel": hunt_result.get("threat_intel", {}),
                "osint": hunt_result.get("osint", {}),
                "recommended_actions": hunt_result.get("recommended_actions", []),
                "patch_recommendations": hunt_result.get("patch_recommendations", []),
                "requires_human_approval": hunt_result.get("requires_human_approval"),
            }, indent=2)

            prompt = _PROMPTS[report_type].format(findings_json=findings_json)

            response = self.groq.chat.completions.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.choices[0].message.content
            return self._parse_and_enrich(raw, hunt_result, report_type, org_id)
        except Exception as e:
            logger.error("report_generation_failed: %s", e)
            return self._fallback_report(hunt_result, report_type, org_id)

    def _parse_and_enrich(self, raw: str, hunt_result: dict, report_type: str, org_id: str) -> dict:
        """Parse LLM JSON and attach metadata."""
        try:
            clean = raw.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean)
        except Exception:
            parsed = {"parse_error": True, "raw": raw[:300]}

        parsed.update({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "org_id": org_id,
            "alert_id": hunt_result.get("alert_id"),
            "report_type": report_type,
        })
        return parsed

    def _fallback_report(self, hunt_result: dict, report_type: str, org_id: str) -> dict:
        return {
            "report_type": report_type,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "org_id": org_id,
            "alert_id": hunt_result.get("alert_id"),
            "executive_summary": hunt_result.get("incident_summary", "Report generation unavailable."),
            "severity": hunt_result.get("final_verdict", "high"),
            "error": "LLM unavailable — manual review required",
        }
