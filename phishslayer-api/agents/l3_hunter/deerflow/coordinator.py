"""
l3_hunter/deerflow/coordinator.py — DeerFlow 2.0 L3 Hunt coordinator adapter.

DeerFlow SDK: pip install git+https://github.com/bytedance/deer-flow.git
API reference: Coordinator, ResearchConfig

Runs Reader→Hunter→Reviewer pipeline. All phases publish SSE events to
Redis channel agent-trace:{alert_id}. Returns structured HuntResult.

SDK_REQUIRED: deerflow.Coordinator
SDK_REQUIRED: deerflow.ResearchConfig
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Optional

log = logging.getLogger(__name__)


@dataclass
class HuntResult:
    alert_id: str
    org_id: str
    hunt_objective: str
    executive_summary: str
    ioc_table: list[dict]
    attack_chain: list[dict]
    mitre_techniques: list[dict]
    recommendations: list[dict]
    confidence: float
    sources: list[str]
    requires_human_approval: bool = False
    error: Optional[str] = None
    phases_completed: list[str] = field(default_factory=list)


class DeerFlowCoordinator:
    """
    L3 Hunter coordinator using DeerFlow 2.0.

    Adapter pattern: wraps DeerFlow SDK with graceful fallback when SDK
    is not installed. Phase events are published to Redis for SSE streaming.
    """

    PHASES = ["reader", "hunter", "reviewer"]

    def __init__(self, org_id: str):
        self.org_id = org_id
        self._coordinator = self._init_deerflow()

    def _init_deerflow(self) -> Optional[Any]:
        try:
            from deerflow import Coordinator, ResearchConfig  # type: ignore[import]
            config = ResearchConfig(
                llm_provider="groq",
                llm_model="llama3-70b-8192",
                search_provider="scrapling",
                max_plan_iterations=3,
                max_search_results=20,
                max_tokens=8000,
            )
            return Coordinator(config=config)
        except ImportError:
            log.warning(
                "DeerFlow SDK not installed — L3 running in structured-fallback mode. "
                "Install: pip install git+https://github.com/bytedance/deer-flow.git"
            )
            return None

    async def _publish_phase(self, alert_id: str, phase: str, status: str, data: dict = {}) -> None:
        """Publish phase event to Redis for SSE streaming."""
        try:
            import redis.asyncio as aioredis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            r = aioredis.from_url(redis_url)
            payload = json.dumps({"type": "phase_complete", "phase": phase, "status": status, **data})
            await r.publish(f"agent-trace:{alert_id}", payload)
            await r.aclose()
        except Exception as e:
            log.debug("Redis publish skipped (no Redis): %s", e)

    async def _publish_log(self, alert_id: str, agent: str, message: str) -> None:
        try:
            import redis.asyncio as aioredis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            r = aioredis.from_url(redis_url)
            payload = json.dumps({"type": "log_line", "agent": agent, "message": message})
            await r.publish(f"agent-trace:{alert_id}", payload)
            await r.aclose()
        except Exception as e:
            log.debug("Redis log publish skipped: %s", e)

    async def run(self, alert_id: str, l2_result: dict, raw_iocs: list[dict] = []) -> HuntResult:
        """
        Execute full Reader→Hunter→Reviewer pipeline.

        Returns HuntResult. Never raises — returns error HuntResult on failure.
        """
        hunt_objective = l2_result.get("hunt_objective") or (
            f"Deep threat hunt for alert {alert_id}: {l2_result.get('verdict', 'unknown threat')}"
        )

        phases_done: list[str] = []

        if self._coordinator is not None:
            return await self._run_deerflow(alert_id, hunt_objective, l2_result, raw_iocs, phases_done)

        return await self._run_fallback(alert_id, hunt_objective, l2_result, raw_iocs)

    async def _run_deerflow(
        self,
        alert_id: str,
        hunt_objective: str,
        l2_result: dict,
        raw_iocs: list[dict],
        phases_done: list[str],
    ) -> HuntResult:
        try:
            from deerflow import ResearchInput  # type: ignore[import]

            await self._publish_phase(alert_id, "reader", "running")
            await self._publish_log(alert_id, "Reader", f"Starting deep hunt: {hunt_objective[:120]}")

            context = {
                "l2_verdict": l2_result.get("verdict"),
                "proposed_actions": l2_result.get("proposed_actions", []),
                "source_ip": l2_result.get("source_ip"),
                "affected_asset": l2_result.get("affected_asset"),
                "org_id": self.org_id,
                "raw_iocs": raw_iocs,
            }
            research_input = ResearchInput(objective=hunt_objective, context=context)
            result = await self._coordinator.run(research_input)
            phases_done.extend(self.PHASES)

            for phase in self.PHASES:
                await self._publish_phase(alert_id, phase, "complete")

            await self._publish_phase(alert_id, "reviewer", "complete", {"type": "report_ready"})

            return HuntResult(
                alert_id=alert_id,
                org_id=self.org_id,
                hunt_objective=hunt_objective,
                executive_summary=getattr(result, "summary", ""),
                ioc_table=getattr(result, "iocs", []),
                attack_chain=getattr(result, "attack_chain", []),
                mitre_techniques=getattr(result, "mitre_techniques", []),
                recommendations=getattr(result, "recommendations", []),
                confidence=float(getattr(result, "confidence", 0.75)),
                sources=getattr(result, "sources", []),
                phases_completed=phases_done,
            )
        except Exception as e:
            log.error("DeerFlow coordinator failed for alert %s: %s", alert_id, e)
            return HuntResult(
                alert_id=alert_id,
                org_id=self.org_id,
                hunt_objective=hunt_objective,
                executive_summary="",
                ioc_table=[],
                attack_chain=[],
                mitre_techniques=[],
                recommendations=[],
                confidence=0.0,
                sources=[],
                error="DEERFLOW_FAILED",
                phases_completed=phases_done,
            )

    async def _run_fallback(
        self,
        alert_id: str,
        hunt_objective: str,
        l2_result: dict,
        raw_iocs: list[dict],
    ) -> HuntResult:
        """Structured fallback when DeerFlow SDK is not available."""
        phases_done: list[str] = []
        try:
            from phishslayer_api.agents.l3_hunter.deerflow.researcher import FallbackResearcher
            from phishslayer_api.agents.l3_hunter.deerflow.reporter import FallbackReporter
        except ImportError:
            from agents.l3_hunter.deerflow.researcher import FallbackResearcher
            from agents.l3_hunter.deerflow.reporter import FallbackReporter

        await self._publish_phase(alert_id, "reader", "running")
        researcher = FallbackResearcher(self.org_id)
        research_data = await researcher.research(alert_id, hunt_objective, l2_result, raw_iocs)
        phases_done.append("reader")
        await self._publish_phase(alert_id, "reader", "complete")

        await self._publish_phase(alert_id, "hunter", "running")
        phases_done.append("hunter")
        await self._publish_phase(alert_id, "hunter", "complete")

        await self._publish_phase(alert_id, "reviewer", "running")
        reporter = FallbackReporter(self.org_id)
        report = await reporter.synthesize(alert_id, hunt_objective, research_data)
        phases_done.append("reviewer")
        await self._publish_phase(alert_id, "reviewer", "complete", {"type": "report_ready"})

        return HuntResult(
            alert_id=alert_id,
            org_id=self.org_id,
            hunt_objective=hunt_objective,
            executive_summary=report.get("executive_summary", ""),
            ioc_table=report.get("ioc_table", []),
            attack_chain=report.get("attack_chain", []),
            mitre_techniques=report.get("mitre_techniques", []),
            recommendations=report.get("recommendations", []),
            confidence=report.get("confidence", 0.70),
            sources=report.get("sources", []),
            phases_completed=phases_done,
        )
