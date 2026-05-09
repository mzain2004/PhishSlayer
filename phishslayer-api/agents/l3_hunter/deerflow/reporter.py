"""
l3_hunter/deerflow/reporter.py — DeerFlow ReporterNode adapter + fallback.

Synthesizes IOC table, attack chain, MITRE ATT&CK mapping.
Auto-indexes report into Page Index RAG for future retrieval.
Outputs structured HuntReport Pydantic model.

SDK_REQUIRED: deerflow.ReporterNode
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

from pydantic import BaseModel

log = logging.getLogger(__name__)

GROQ_MODEL = "llama3-70b-8192"


class HuntReport(BaseModel):
    executive_summary: str
    ioc_table: list[dict]
    attack_chain: list[dict]
    mitre_techniques: list[dict]
    recommendations: list[dict]
    confidence: float
    sources: list[str]


class FallbackReporter:
    """
    Standalone reporter used when DeerFlow SDK is not installed.
    Calls Groq directly to synthesize research data into a structured report.
    Indexes result into Page Index RAG for future retrieval.
    """

    def __init__(self, org_id: str):
        self.org_id = org_id

    async def synthesize(self, alert_id: str, hunt_objective: str, research_data: dict) -> dict:
        """Synthesize research data into a structured hunt report. Uses ModelRouter (DEEP tier)."""
        try:
            report = await self._call_model_router(hunt_objective, research_data)
        except Exception:
            try:
                report = await self._call_groq(hunt_objective, research_data)
            except Exception as e:
                log.error("Synthesis failed for alert %s: %s", alert_id, e)
                report = self._empty_report(hunt_objective)

        # Index report into Page Index RAG for future retrieval
        await self._index_report(alert_id, hunt_objective, report)
        return report

    async def _call_model_router(self, hunt_objective: str, research_data: dict) -> dict:
        """Use AnthropicClient via ModelRouter (DEEP tier = Opus)."""
        import asyncio
        import json
        from core.harness.anthropic_client import anthropic_client

        rag_snippets = "\n".join(
            c.get("content", "")[:200] for c in research_data.get("rag_context", [])[:3]
        )
        osint_summary = str(research_data.get("scrapling", []))[:500]
        vt_summary = str(research_data.get("vt_results", []))[:300]
        iocs_raw = research_data.get("iocs_found", [])

        system_prompt = (
            "You are a senior threat hunter. Synthesize the following research into a structured "
            "hunt report. Return valid JSON only with keys: executive_summary (string), "
            "ioc_table (array of {value, type, threat_score, source}), "
            "attack_chain (array of {step, description, technique}), "
            "mitre_techniques (array of {id, name, tactic}), "
            "recommendations (array of {priority, action, rationale}), "
            "confidence (float 0-1), sources (array of strings)."
        )
        user_prompt = (
            f"Hunt objective: {hunt_objective}\n\n"
            f"RAG context:\n{rag_snippets}\n\n"
            f"OSINT findings:\n{osint_summary}\n\n"
            f"VirusTotal results:\n{vt_summary}\n\n"
            f"Raw IOCs: {iocs_raw}"
        )

        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(
            None,
            lambda: anthropic_client.complete(
                agent_name="l3_reporter",
                system_prompt=system_prompt,
                user_message=user_prompt,
                response_format="json",
            ),
        )
        return json.loads(raw)

    async def _call_groq(self, hunt_objective: str, research_data: dict) -> dict:
        import asyncio
        import json
        from groq import Groq

        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

        rag_snippets = "\n".join(
            c.get("content", "")[:200] for c in research_data.get("rag_context", [])[:3]
        )
        osint_summary = str(research_data.get("scrapling", []))[:500]
        vt_summary = str(research_data.get("vt_results", []))[:300]
        iocs_raw = research_data.get("iocs_found", [])

        system_prompt = (
            "You are a senior threat hunter. Synthesize the following research into a structured "
            "hunt report. Return valid JSON only with keys: executive_summary (string), "
            "ioc_table (array of {value, type, threat_score, source}), "
            "attack_chain (array of {step, description, technique}), "
            "mitre_techniques (array of {id, name, tactic}), "
            "recommendations (array of {priority, action, rationale}), "
            "confidence (float 0-1), sources (array of strings)."
        )
        user_prompt = (
            f"Hunt objective: {hunt_objective}\n\n"
            f"RAG context:\n{rag_snippets}\n\n"
            f"OSINT findings:\n{osint_summary}\n\n"
            f"VirusTotal results:\n{vt_summary}\n\n"
            f"Raw IOCs: {iocs_raw}"
        )

        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=2000,
                response_format={"type": "json_object"},
            ),
        )

        import json
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)

    def _empty_report(self, hunt_objective: str) -> dict:
        return {
            "executive_summary": f"Automated hunt for: {hunt_objective}. Manual review required.",
            "ioc_table": [],
            "attack_chain": [],
            "mitre_techniques": [],
            "recommendations": [{"priority": "P0", "action": "Manual investigation required", "rationale": "Automated synthesis failed"}],
            "confidence": 0.0,
            "sources": [],
        }

    async def _index_report(self, alert_id: str, hunt_objective: str, report: dict) -> None:
        """Index the hunt report summary into Page Index RAG for future retrieval."""
        try:
            from memory.rag.hybrid_rag import HybridRAGAdapter
            adapter = HybridRAGAdapter()
            doc = {
                "heading": f"Hunt Report: {hunt_objective[:80]}",
                "content": report.get("executive_summary", ""),
                "source": f"hunt_report:{alert_id}",
                "page_number": 1,
                "mitre_techniques": [t.get("id") for t in report.get("mitre_techniques", [])],
            }
            adapter.add_document(doc)
        except Exception as e:
            log.debug("Report indexing skipped: %s", e)


try:
    from deerflow import ReporterNode  # type: ignore[import]

    class L3ReporterNode(ReporterNode):
        """
        DeerFlow ReporterNode subclass that auto-indexes into Page Index RAG.
        """

        def __init__(self, org_id: str, **kwargs: Any):
            super().__init__(**kwargs)
            self._fallback_reporter = FallbackReporter(org_id)

        async def post_report(self, alert_id: str, report: Any) -> None:
            """Called by DeerFlow after report generation — indexes into RAG."""
            try:
                report_dict = report.dict() if hasattr(report, "dict") else {}
                await self._fallback_reporter._index_report(
                    alert_id,
                    getattr(report, "objective", ""),
                    report_dict,
                )
            except Exception as e:
                log.warning("L3ReporterNode post_report indexing failed: %s", e)

except ImportError:
    pass
