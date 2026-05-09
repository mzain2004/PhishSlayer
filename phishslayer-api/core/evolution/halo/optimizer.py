"""
halo/optimizer.py — HALO self-optimization adapter.

HALO SDK: pip install git+https://github.com/context-labs/halo.git
API reference: HALOClient, FeedbackSignal, OptimizableParam

Proposals stored in agent_evolution table with applied=false.
NEVER auto-applied — human review required via Evolution Dashboard.

SDK_REQUIRED: halo.HALOClient
SDK_REQUIRED: halo.FeedbackSignal
SDK_REQUIRED: halo.OptimizableParam
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

log = logging.getLogger(__name__)


class HALOOptimizer:
    """
    HALO-based per-org confidence threshold optimizer.

    Tracks outcome feedback (TP/FP/FN) and proposes updated thresholds.
    All proposals stored as pending — never auto-applied.
    """

    DEFAULT_THRESHOLD = 0.85
    MIN_THRESHOLD = 0.70
    MAX_THRESHOLD = 0.98

    def __init__(self, org_id: str):
        self.org_id = org_id
        self._client = self._init_halo(org_id)

    def _init_halo(self, org_id: str) -> Optional[Any]:
        """Initialize HALO client if SDK is available."""
        api_key = os.getenv("HALO_API_KEY", "")
        if not api_key:
            log.info("HALO_API_KEY not set — HALO optimizer running in no-op mode")
            return None
        try:
            # SDK_REQUIRED: from halo import HALOClient, OptimizableParam
            from halo import HALOClient, OptimizableParam  # type: ignore[import]
            client = HALOClient(api_key=api_key, project_id=f"phishslayer-{org_id}")
            client.register_param(OptimizableParam(
                name="confidence_threshold",
                initial_value=self.DEFAULT_THRESHOLD,
                min_value=self.MIN_THRESHOLD,
                max_value=self.MAX_THRESHOLD,
            ))
            return client
        except ImportError:
            log.warning("HALO SDK not installed — running in no-op mode. Install: pip install git+https://github.com/context-labs/halo.git")
            return None

    def get_param(self, name: str, default: float) -> float:
        """Get current optimized parameter value."""
        if self._client is None:
            return default
        try:
            return float(self._client.get_param(name, default=default))
        except Exception as e:
            log.warning("HALO get_param failed: %s", e)
            return default

    def record_outcome(
        self,
        alert_id: str,
        final_confidence: float,
        actions: list[dict],
        results: list[dict],
        false_positive: bool,
    ) -> None:
        """Record incident outcome as HALO feedback signal."""
        if self._client is None:
            return
        try:
            # SDK_REQUIRED: from halo import FeedbackSignal
            from halo import FeedbackSignal  # type: ignore[import]
            signal = FeedbackSignal(
                episode_id=alert_id,
                reward=0.0 if false_positive else 1.0,
                metadata={
                    "final_confidence": final_confidence,
                    "actions_taken": len(actions),
                    "success_rate": sum(1 for r in results if r.get("status") == "executed") / max(len(results), 1),
                },
            )
            self._client.record(signal)

            # Store any proposals HALO generates as pending in Supabase
            proposals = self._client.get_proposals()
            if proposals:
                self._persist_proposals(proposals)
        except Exception as e:
            log.warning("HALO record_outcome failed: %s", e)

    def _persist_proposals(self, proposals: list) -> None:
        """Store HALO proposals in agent_evolution table (pending, never auto-applied)."""
        try:
            from supabase import create_client
            url = os.getenv("SUPABASE_URL", "")
            key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if not url or not key:
                return
            sb = create_client(url, key)
            for proposal in proposals:
                sb.table("agent_evolution").insert({
                    "organization_id": self.org_id,
                    "source": "halo",
                    "proposal_type": "threshold_adjustment",
                    "proposal_data": proposal if isinstance(proposal, dict) else {"value": str(proposal)},
                    "applied": False,
                }).execute()
        except Exception as e:
            log.warning("HALO _persist_proposals failed: %s", e)
