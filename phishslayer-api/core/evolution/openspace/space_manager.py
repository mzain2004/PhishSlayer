"""
core/evolution/openspace/space_manager.py — OpenSpace self-reflection adapter.

OpenSpace SDK: pip install git+https://github.com/HKUDS/OpenSpace.git
API reference: OpenSpace, ActionSpace, TokenBudget, ReflectionConfig

Runs reflection after every 10 incidents. Proposals stored in agent_evolution
with applied=false — NEVER auto-applied without human approval.

SDK_REQUIRED: openspace.OpenSpace
SDK_REQUIRED: openspace.ReflectionConfig
SDK_REQUIRED: openspace.TokenBudget
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Optional

log = logging.getLogger(__name__)

REFLECTION_INTERVAL = 10
REFLECTION_MODEL = "llama3-70b-8192"


@dataclass
class ActionRecord:
    alert_id: str
    agent_level: str
    action_name: str
    outcome: str
    tokens_used: int
    success: bool


class OpenSpaceManager:
    """
    OpenSpace self-reflection for per-agent capability improvement.

    Tracks action history; runs reflection after every REFLECTION_INTERVAL incidents.
    All proposals stored as pending — never auto-applied.
    """

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self._space = self._init_openspace(agent_name)
        self._action_log: list[ActionRecord] = []
        self._incident_count = 0

    def _init_openspace(self, agent_name: str) -> Optional[Any]:
        redis_url = os.getenv("REDIS_URL", "")
        if not redis_url:
            log.info("REDIS_URL not set — OpenSpace running in no-op mode")
            return None
        try:
            from openspace import OpenSpace, ReflectionConfig  # type: ignore[import]
            config = ReflectionConfig(
                reflection_model=f"groq/{REFLECTION_MODEL}",
                max_reflection_tokens=2000,
                action_history_window=50,
                promotion_threshold=0.75,
                demotion_threshold=0.25,
            )
            space = OpenSpace(
                name=agent_name,
                config=config,
                storage_backend="redis",
                redis_url=redis_url,
            )
            return space
        except ImportError:
            log.warning(
                "OpenSpace SDK not installed — running in no-op mode. "
                "Install: pip install git+https://github.com/HKUDS/OpenSpace.git"
            )
            return None

    def get_budget(self, alert_id: str) -> Any:
        """Return token budget for this alert's LangGraph nodes."""
        if self._space is None:
            return _NullBudget()
        try:
            from openspace import TokenBudget  # type: ignore[import]
            return self._space.get_budget(alert_id)
        except Exception as e:
            log.warning("OpenSpace get_budget failed: %s", e)
            return _NullBudget()

    def record_actions(
        self,
        alert_id: str,
        actions: list[dict],
        outcome: str,
        tokens_used: int,
    ) -> None:
        """Record completed incident actions for reflection."""
        self._incident_count += 1

        for action in actions:
            record = ActionRecord(
                alert_id=alert_id,
                agent_level=self.agent_name,
                action_name=action.get("name", "unknown"),
                outcome=outcome,
                tokens_used=tokens_used // max(len(actions), 1),
                success=outcome in ("executed", "closed", "escalated"),
            )
            self._action_log.append(record)

        if self._space is not None:
            try:
                self._space.record(alert_id=alert_id, actions=actions, outcome=outcome, tokens=tokens_used)
            except Exception as e:
                log.warning("OpenSpace record failed: %s", e)

        if self._incident_count % REFLECTION_INTERVAL == 0:
            self.run_reflection()

    def run_reflection(self) -> list[dict]:
        """
        Run OpenSpace reflection on action history.
        Returns proposals stored in agent_evolution (applied=false).
        Never auto-applies without human approval.
        """
        proposals: list[dict] = []

        if self._space is not None:
            try:
                proposals = self._space.reflect() or []
            except Exception as e:
                log.warning("OpenSpace reflection failed: %s", e)
                proposals = self._fallback_reflect()
        else:
            proposals = self._fallback_reflect()

        if proposals:
            self._persist_proposals(proposals)

        return proposals

    def _fallback_reflect(self) -> list[dict]:
        """Generate simple pattern-based proposals from action log."""
        if len(self._action_log) < REFLECTION_INTERVAL:
            return []

        recent = self._action_log[-REFLECTION_INTERVAL:]
        total = len(recent)
        successes = sum(1 for a in recent if a.success)
        success_rate = successes / total if total > 0 else 0.0

        avg_tokens = sum(a.tokens_used for a in recent) / total if total > 0 else 0
        proposals: list[dict] = []

        if success_rate < 0.60:
            proposals.append({
                "type": "prompt_refinement",
                "agent": self.agent_name,
                "rationale": f"Success rate {success_rate:.0%} over last {REFLECTION_INTERVAL} incidents — review decision prompts",
                "metric_before": success_rate,
                "suggested_change": "Lower confidence threshold or add more enrichment steps",
            })

        if avg_tokens > 4000:
            proposals.append({
                "type": "token_optimization",
                "agent": self.agent_name,
                "rationale": f"Avg {avg_tokens:.0f} tokens/incident — consider shortening system prompts",
                "metric_before": avg_tokens,
                "suggested_change": "Truncate RAG context to top-3 chunks",
            })

        return proposals

    def _persist_proposals(self, proposals: list) -> None:
        """Store OpenSpace proposals in agent_evolution table (applied=false)."""
        try:
            from supabase import create_client
            url = os.getenv("SUPABASE_URL", "")
            key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if not url or not key:
                return
            sb = create_client(url, key)
            for proposal in proposals:
                sb.table("agent_evolution").insert({
                    "source": "openspace",
                    "proposal_type": proposal.get("type", "reflection"),
                    "proposal_data": proposal if isinstance(proposal, dict) else {"value": str(proposal)},
                    "applied": False,
                }).execute()
        except Exception as e:
            log.warning("OpenSpace _persist_proposals failed: %s", e)


class _NullBudget:
    """Returned when OpenSpace is in no-op mode. Budget always has tokens remaining."""

    def remaining(self) -> int:
        return 999_999

    def consume(self, tokens: int) -> None:
        pass

    def is_exhausted(self) -> bool:
        return False
