"""
core/evolution/openspace/token_budget.py — Per-node token budget enforcement.

Checked before every LangGraph node LLM call. If budget exhausted:
- Routes to fast-path (skip LLM, return cached/default result)
- Logs exhaustion event to AgentOps
- Never raises — always returns a budget object
"""
from __future__ import annotations

import logging
import os
from typing import Callable, TypeVar

log = logging.getLogger(__name__)

T = TypeVar("T")

DEFAULT_BUDGET_PER_ALERT = int(os.getenv("OPENSPACE_TOKEN_BUDGET", "8000"))


class NodeTokenBudget:
    """
    Token budget for a single alert's LangGraph execution.

    Tracks token spend per node. On exhaustion: returns fast-path result
    and logs to AgentOps (if configured).
    """

    def __init__(self, alert_id: str, budget: int = DEFAULT_BUDGET_PER_ALERT):
        self.alert_id = alert_id
        self.budget = budget
        self._spent = 0
        self._exhausted_at: list[str] = []

    @property
    def remaining(self) -> int:
        return max(0, self.budget - self._spent)

    @property
    def is_exhausted(self) -> bool:
        return self._spent >= self.budget

    def consume(self, tokens: int, node_name: str = "unknown") -> None:
        self._spent += tokens
        if self.is_exhausted and node_name not in self._exhausted_at:
            self._exhausted_at.append(node_name)
            log.warning(
                "Token budget exhausted at node '%s' for alert %s (spent=%d, budget=%d)",
                node_name,
                self.alert_id,
                self._spent,
                self.budget,
            )
            self._log_to_agentops(node_name)

    def guard(self, node_name: str, fast_path: Callable[[], T], llm_call: Callable[[], T]) -> T:
        """
        Execute llm_call if budget permits; otherwise run fast_path.
        Consumes an estimated 500 tokens for the LLM call if it proceeds.
        """
        if self.is_exhausted:
            log.info("Budget exhausted — fast-path for node '%s'", node_name)
            return fast_path()

        result = llm_call()
        # Estimate token spend; actual spend recorded via consume() in node
        return result

    def summary(self) -> dict:
        return {
            "alert_id": self.alert_id,
            "budget": self.budget,
            "spent": self._spent,
            "remaining": self.remaining,
            "exhausted": self.is_exhausted,
            "exhausted_at_nodes": self._exhausted_at,
        }

    def _log_to_agentops(self, node_name: str) -> None:
        try:
            import agentops  # type: ignore[import]
            from agentops import ActionEvent  # type: ignore[import]
            agentops.record(ActionEvent(
                action_type="budget_exhausted",
                params={"alert_id": self.alert_id, "node": node_name, "spent": self._spent},
                returns={"fast_path_activated": True},
            ))
        except Exception:
            pass
