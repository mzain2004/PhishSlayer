"""
MemoryManager — three-tier memory for PhishSlayer agents.

Short-term : Redis  (agent:{level}:org:{org_id}:alert:{alert_id}:context, TTL=4h)
Long-term  : Supabase pgvector  (match_similar_alerts RPC)
Working    : agentscope InMemoryMemory  (in-process, per-run)
"""
from __future__ import annotations

import json
import os
from typing import Any

import redis.asyncio as aioredis
from agentscope.memory import InMemoryMemory
from supabase import create_client, Client

from observability.logger import get_logger

_log = get_logger("phishslayer.memory")

_TTL_SECONDS = 4 * 3600  # 4 hours


def _supabase() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL", ""),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    )


def _redis() -> aioredis.Redis:
    return aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


def _redis_key(level: str, org_id: str, alert_id: str) -> str:
    return f"agent:{level}:org:{org_id}:alert:{alert_id}:context"


class MemoryManager:
    """Handles short-term (Redis), long-term (pgvector), and working (in-process) memory."""

    def __init__(self) -> None:
        self._working: dict[str, InMemoryMemory] = {}

    def _get_working(self, alert_id: str) -> InMemoryMemory:
        if alert_id not in self._working:
            self._working[alert_id] = InMemoryMemory()
        return self._working[alert_id]

    # ------------------------------------------------------------------
    # Short-term (Redis)
    # ------------------------------------------------------------------

    async def load_working_memory(self, alert_id: str, org_id: str, level: str) -> dict:
        key = _redis_key(level, org_id, alert_id)
        async with _redis() as r:
            raw = await r.get(key)
        if raw is None:
            _log.info("memory_cache_miss", extra={"metadata": {"alert_id": alert_id, "level": level}})
            return {}
        _log.info("memory_cache_hit", extra={"metadata": {"alert_id": alert_id, "level": level}})
        return json.loads(raw)

    async def save_working_memory(self, alert_id: str, org_id: str, level: str, data: dict) -> None:
        key = _redis_key(level, org_id, alert_id)
        async with _redis() as r:
            await r.set(key, json.dumps(data), ex=_TTL_SECONDS)
        _log.info("memory_saved", extra={"metadata": {"alert_id": alert_id, "level": level}})

    async def flush_working_memory(self, alert_id: str, level: str) -> None:
        # Flush across all orgs by pattern — use with care
        pattern = f"agent:{level}:org:*:alert:{alert_id}:context"
        async with _redis() as r:
            keys = await r.keys(pattern)
            if keys:
                await r.delete(*keys)

    # ------------------------------------------------------------------
    # Long-term (Supabase pgvector)
    # ------------------------------------------------------------------

    async def query_similar_alerts(
        self, org_id: str, alert_id: str, top_k: int = 5
    ) -> list[dict]:
        """Call match_similar_alerts RPC; returns empty list on any failure."""
        _log.info("pgvector_query", extra={"metadata": {"alert_id": alert_id, "top_k": top_k}})
        try:
            client = _supabase()
            result = client.rpc(
                "match_similar_alerts",
                {"p_org_id": org_id, "p_alert_id": alert_id, "p_top_k": top_k},
            ).execute()
            return result.data or []
        except Exception:
            _log.error("pgvector_error", extra={"error_code": "PGVECTOR_FAILED", "metadata": {"alert_id": alert_id}})
            return []

    # ------------------------------------------------------------------
    # Supabase persistence
    # ------------------------------------------------------------------

    async def persist_reasoning(
        self,
        alert_id: str,
        level: str,
        reasoning_trace: list[dict],
        decision: dict,
    ) -> None:
        try:
            client = _supabase()
            client.table("agent_reasoning").insert({
                "alert_id": alert_id,
                "agent_level": level,
                "reasoning_trace": reasoning_trace,
                "decision": decision,
            }).execute()
        except Exception:
            pass  # non-fatal — ops team monitors Supabase logs
