"""
Ruflo Memory Coordinator namespace adapter.

Adapts ruflo's namespace-based coordination memory pattern from
agent-memory-coordinator into PhishSlayer's Redis MemoryManager.

Pattern source: ruflo/.agents/skills/agent-memory-coordinator/SKILL.md
  - Namespace: coordination/<swarm-id>  → stored as ruflo:coord:{swarm_id}:{key}
  - Namespace: project/<name>           → stored as ruflo:project:{org_id}:{key}
Integration point: MemoryManager — adds cross-agent state sharing during multi-level runs.
"""
from __future__ import annotations

import json
import os

import redis.asyncio as aioredis

_DEFAULT_TTL = 4 * 3600  # 4h — matches MemoryManager short-term TTL
_COORD_PREFIX = "ruflo:coord"
_PROJECT_PREFIX = "ruflo:project"


def _redis() -> aioredis.Redis:
    return aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


# ── Coordination namespace (cross-agent swarm state) ──────────────────────────

async def store_coord_state(swarm_id: str, key: str, value: dict, ttl: int = _DEFAULT_TTL) -> None:
    """
    Store cross-agent coordination state.
    Mirrors ruflo's memory_usage store with namespace=coordination.
    """
    redis_key = f"{_COORD_PREFIX}:{swarm_id}:{key}"
    async with _redis() as r:
        await r.set(redis_key, json.dumps(value), ex=ttl)


async def retrieve_coord_state(swarm_id: str, key: str) -> dict | None:
    """Retrieve coordination state; returns None on miss."""
    redis_key = f"{_COORD_PREFIX}:{swarm_id}:{key}"
    async with _redis() as r:
        raw = await r.get(redis_key)
    return json.loads(raw) if raw else None


async def search_coord_states(swarm_id: str, pattern: str = "*") -> list[dict]:
    """
    Search coordination namespace by pattern.
    Mirrors ruflo's memory_search for coordination data.
    """
    match_key = f"{_COORD_PREFIX}:{swarm_id}:{pattern}"
    async with _redis() as r:
        keys = await r.keys(match_key)
        if not keys:
            return []
        values = await r.mget(*keys)
    return [json.loads(v) for v in values if v]


# ── Project namespace (org-scoped persistent context) ─────────────────────────

async def store_project_context(org_id: str, key: str, value: dict, ttl: int = _DEFAULT_TTL) -> None:
    """Store org-scoped project context. Mirrors ruflo's project/<name> namespace."""
    redis_key = f"{_PROJECT_PREFIX}:{org_id}:{key}"
    async with _redis() as r:
        await r.set(redis_key, json.dumps(value), ex=ttl)


async def retrieve_project_context(org_id: str, key: str) -> dict | None:
    redis_key = f"{_PROJECT_PREFIX}:{org_id}:{key}"
    async with _redis() as r:
        raw = await r.get(redis_key)
    return json.loads(raw) if raw else None


# ── Swarm status helpers (ruflo swarm$status pattern) ─────────────────────────

async def write_swarm_status(alert_id: str, level: str, status: str, extra: dict | None = None) -> None:
    """
    Write agent status to coordination namespace.
    Ruflo requires every spawned agent to immediately write initial status.
    """
    payload = {"agent": f"phishslayer-{level}", "status": status, "alert_id": alert_id}
    if extra:
        payload.update(extra)
    await store_coord_state(swarm_id=alert_id, key=f"{level}:status", value=payload)


async def read_swarm_status(alert_id: str, level: str) -> dict | None:
    return await retrieve_coord_state(swarm_id=alert_id, key=f"{level}:status")
