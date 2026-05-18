
"""
l3_hunter.py — L3 Hunter Swarm.
3 sub-agents: Reader (threat intel) → Hunter (OSINT) → Reviewer (final report).
Receives L2 InvestigationResult JSON only — never full history.
Page Index RAG feeds threat intel context into Reader.
Scrapling handles live OSINT fetching.
Clean context per sub-agent (Decepticon pattern).
"""

import os
import json
import requests
from groq import Groq
from dataclasses import dataclass, asdict, field
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

from harness.page_index_rag import DocumentTree
from harness.verify_interface import VerifyInterface
from harness.state_store import StateStore
from services.stix_exporter import STIXExporter


@dataclass
class ThreatIntelFindings:
    """Reader sub-agent output."""
    mitre_techniques: list[str]
    known_apt_groups: list[str]
    related_campaigns: list[str]
    rag_context: list[str]
    confidence_boost: float


@dataclass
class OSINTFindings:
    """Hunter sub-agent output."""
    ip_reputation: dict
    domain_info: dict
    related_iocs: list[str]
    threat_feeds_hit: list[str]
    risk_score: float


@dataclass
class HuntResult:
    """Final L3 output. Passed to incident report."""
    alert_id: str
    org_id: str
    threat_intel: dict
    osint: dict
    final_verdict: str
    confidence: float
    recommended_actions: list[str]
    incident_summary: str
    patch_recommendations: list[str]
    requires_human_approval: bool
    stix_bundle: Optional[dict] = field(default=None)


class L3HunterAgent:
    """
    L3 Hunter Swarm.
    Reader: enriches MITRE context via PageIndexRAG.
    Hunter: OSINT on IPs/domains via threat feeds.
    Reviewer: synthesizes all findings → final incident report.
    """

    MODEL = "llama-3.3-70b-versatile"
    MAX_TOKENS = 2000

    def __init__(self, verify: VerifyInterface,
                 doc_tree: DocumentTree = None, state_store: Optional[StateStore] = None):
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            self.groq = Groq(api_key=api_key)
        else:
            self.groq = None
        self.verify = verify
        self.doc_tree = doc_tree or DocumentTree()
        self.state_store = state_store
        self.stix_exporter = STIXExporter()

    async def hunt(self, l2_result: dict, org_id: str) -> HuntResult:
        """
        Main entry. Takes L2 InvestigationResult dict.
        Returns HuntResult. Never raises.
        """
        alert_id = l2_result.get("alert_id", "unknown")
        if not self.groq:
            return self._safe_fallback(alert_id, org_id, "GROQ_API_KEY missing")

        session_id = self.verify.start_session(alert_id, name="l3_hunter")
        try:
            intel = self._reader(l2_result)
            osint = self._hunter(l2_result)
            result = self._reviewer(alert_id, org_id, l2_result, intel, osint)
            result.stix_bundle = self.stix_exporter.export_hunt_result(asdict(result))
            self.verify.log_agent_action(session_id, "l3_hunter", asdict(result))

            # Persist to MongoDB
            if self.state_store:
                await self.state_store.save(alert_id, "l3", asdict(result), org_id)

            self.verify.end_session(session_id, "Success")
            return result
        except Exception as e:
            self.verify.end_session(session_id, "Fail")
            return self._safe_fallback(alert_id, org_id, str(e))

    def _reader(self, l2_result: dict) -> ThreatIntelFindings:
        """
        Reader sub-agent.
        Queries PageIndexRAG for relevant threat intel sections.
        Then Groq enriches MITRE context.
        Clean context: receives L2 findings only.
        """
        techniques = l2_result.get("opplan", {}).get("investigation_steps", [])
        l1_techniques = []
        if "opplan" in l2_result:
            l1_techniques = l2_result.get("opplan", {}).get(
                "attacker_hypothesis", ""
            ).split()

        rag_nodes = self.doc_tree.query(
            mitre_techniques=l1_techniques,
            keywords=["brute force", "ssh", "lateral movement"],
            top_k=3
        )
        rag_context = [f"{n.heading}: {n.content[:200]}" for n in rag_nodes]

        prompt = f"""You are a threat intelligence analyst.
Analyze L2 investigation findings and identify threat actor context.

L2 Findings Summary:
- Confirmed threat: {l2_result.get('confirmed_threat')}
- Attacker pivot: {l2_result.get('attacker_pivot_analysis', '')}
- Evidence: {l2_result.get('evidence_gathered', [])}
- OPPLAN hypothesis: {l2_result.get('opplan', {}).get('attacker_hypothesis', '')}

Threat Intel Context (from document library):
{chr(10).join(rag_context) if rag_context else 'No documents loaded yet.'}

Return ONLY valid JSON:
{{
  "mitre_techniques": ["T1110", "T1133"],
  "known_apt_groups": ["<group if identifiable, else empty>"],
  "related_campaigns": ["<campaign if identifiable, else empty>"],
  "confidence_boost": <0.0 to 0.15>
}}"""

        response = self.groq.chat.completions.create(
            model=self.MODEL, max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = self._parse_json_safe(response.choices[0].message.content)
        return ThreatIntelFindings(
            mitre_techniques=raw.get("mitre_techniques", []),
            known_apt_groups=raw.get("known_apt_groups", []),
            related_campaigns=raw.get("related_campaigns", []),
            rag_context=rag_context,
            confidence_boost=float(raw.get("confidence_boost", 0.0)),
        )

    def _hunter(self, l2_result: dict) -> OSINTFindings:
        """
        Hunter sub-agent.
        Queries free threat intel APIs for IP reputation.
        Falls back gracefully if APIs unreachable.
        Clean context: extracts IPs from L2 only.
        """
        evidence = l2_result.get("evidence_gathered", [])
        import re
        ip_pattern = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
        ips = []
        for e in evidence:
            ips.extend(ip_pattern.findall(str(e)))
        ips = list(set(ips))[:3]

        ip_reputation = {}
        threat_feeds = []

        for ip in ips:
            try:
                r = requests.get(
                    f"https://ipapi.co/{ip}/json/",
                    timeout=5
                )
                if r.status_code == 200:
                    data = r.json()
                    ip_reputation[ip] = {
                        "country": data.get("country_name", "unknown"),
                        "org": data.get("org", "unknown"),
                        "is_datacenter": "hosting" in data.get("org", "").lower()
                            or "cloud" in data.get("org", "").lower(),
                    }
                    if ip_reputation[ip]["is_datacenter"]:
                        threat_feeds.append(f"datacenter_ip:{ip}")
            except Exception:
                ip_reputation[ip] = {"error": "lookup_failed"}

        risk = 0.3
        if any(v.get("is_datacenter") for v in ip_reputation.values()):
            risk = 0.7
        if len(ips) == 0:
            risk = 0.5

        return OSINTFindings(
            ip_reputation=ip_reputation,
            domain_info={},
            related_iocs=ips,
            threat_feeds_hit=threat_feeds,
            risk_score=risk,
        )

    def _reviewer(self, alert_id: str, org_id: str,
                  l2_result: dict, intel: ThreatIntelFindings,
                  osint: OSINTFindings) -> HuntResult:
        """
        Reviewer sub-agent.
        Synthesizes L2 + threat intel + OSINT → final incident report.
        Red team mindset: what did attacker achieve? What's next?
        """
        final_confidence = min(
            float(l2_result.get("confidence", 0.5)) + intel.confidence_boost,
            1.0
        )

        prompt = f"""You are a senior incident commander writing a final report.
Synthesize all findings into actionable recommendations.

L2 Investigation:
- Verdict: {l2_result.get('verdict')}
- Confirmed threat: {l2_result.get('confirmed_threat')}
- Human required actions: {l2_result.get('human_required_actions', [])}
- Approved actions: {l2_result.get('approved_actions', [])}

Threat Intelligence:
- MITRE techniques: {intel.mitre_techniques}
- Known APT groups: {intel.known_apt_groups}

OSINT:
- IP reputation: {json.dumps(osint.ip_reputation)}
- Risk score: {osint.risk_score}
- Threat feeds: {osint.threat_feeds_hit}

Think like a red teamer: what did attacker achieve? What do they do next?
Then think like defender: what stops them?

Return ONLY valid JSON:
{{
  "final_verdict": "critical|high|medium|low|false_positive",
  "incident_summary": "<2 sentences max — what happened and impact>",
  "recommended_actions": ["<action1>", "<action2>"],
  "patch_recommendations": ["<patch1>", "<patch2>"],
  "requires_human_approval": <true|false>
}}"""

        response = self.groq.chat.completions.create(
            model=self.MODEL, max_tokens=self.MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = self._parse_json_safe(response.choices[0].message.content)

        return HuntResult(
            alert_id=alert_id,
            org_id=org_id,
            threat_intel=asdict(intel),
            osint=asdict(osint),
            final_verdict=raw.get("final_verdict", "high"),
            confidence=round(final_confidence, 3),
            recommended_actions=raw.get("recommended_actions", []),
            incident_summary=raw.get("incident_summary", ""),
            patch_recommendations=raw.get("patch_recommendations", []),
            requires_human_approval=bool(raw.get("requires_human_approval", True)),
        )

    def _parse_json_safe(self, raw: str) -> dict:
        try:
            clean = raw.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        except Exception:
            return {}

    def _safe_fallback(self, alert_id: str, org_id: str,
                       error: str) -> HuntResult:
        return HuntResult(
            alert_id=alert_id, org_id=org_id,
            threat_intel={}, osint={},
            final_verdict="high",
            confidence=0.0,
            recommended_actions=["manual_review"],
            incident_summary=f"L3 hunt failed: {error[:100]}",
            patch_recommendations=[],
            requires_human_approval=True,
        )
