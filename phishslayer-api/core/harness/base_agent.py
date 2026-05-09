"""
PhishSlayerBaseAgent — base class for all L1/L2/L3 agents.
Wraps agentscope.agent.AgentBase with pre/post reply hooks for
memory loading, Supabase persistence, and AgentOps session tracking.
"""
from __future__ import annotations

import os
from abc import abstractmethod
from typing import Any

from agentscope.agent import AgentBase
from agentscope.message import Msg

from core.harness.memory_manager import MemoryManager


class PhishSlayerBaseAgent(AgentBase):
    """
    Base agent that every PhishSlayer tier subclasses.
    Subclasses must set `level = "l1" | "l2" | "l3"` and implement `reply`.
    """

    level: str = "l1"

    def __init__(self, name: str = "base", **kwargs: Any) -> None:
        super().__init__(name=name, **kwargs)
        self._memory_manager = MemoryManager()

    # ------------------------------------------------------------------
    # Lifecycle hooks
    # ------------------------------------------------------------------

    async def pre_reply(self, alert_id: str, org_id: str) -> dict:
        """
        Load Redis working memory + pgvector similar incidents.
        Returns a context dict merged into the agent's prompt.
        """
        context = await self._memory_manager.load_working_memory(alert_id, org_id, self.level)
        similar = await self._memory_manager.query_similar_alerts(org_id, alert_id)
        return {"working_memory": context, "similar_incidents": similar}

    async def post_reply(
        self,
        msg: Msg,
        alert_id: str,
        reasoning_trace: list[dict],
    ) -> None:
        """
        Persist agent reasoning to Supabase `agent_reasoning` and flush
        the Redis working-memory key for this alert.
        """
        await self._memory_manager.persist_reasoning(
            alert_id=alert_id,
            level=self.level,
            reasoning_trace=reasoning_trace,
            decision=msg.content if isinstance(msg.content, dict) else {"raw": str(msg.content)},
        )
        await self._memory_manager.flush_working_memory(alert_id, self.level)

    # ------------------------------------------------------------------
    # Abstract interface
    # ------------------------------------------------------------------

    @abstractmethod
    def reply(self, x: Msg) -> Msg:
        """Process an incoming message and return a response."""
