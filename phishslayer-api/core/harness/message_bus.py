"""
Redis pub/sub message bus for agent-to-agent communication.
L1 publishes enrichment results → L2 subscribes.
L2 publishes consequence predictions → L3 subscribes.
Channel conventions:
  agent:handoff:{alert_id} — L1→L2 or L2→L3 handoff data
  agent:status:{alert_id}  — agent lifecycle events
  agent:health:{org_id}    — supervisor health broadcasts
"""
from __future__ import annotations

import json
import os
import logging
from typing import AsyncGenerator

log = logging.getLogger(__name__)


class AgentMessageBus:
    def __init__(self, redis_url: str | None = None):
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client = None

    async def _get_client(self):
        if self._client is None:
            import redis.asyncio as aioredis
            self._client = aioredis.from_url(self._redis_url)
        return self._client

    async def publish(self, channel: str, message: dict) -> None:
        try:
            r = await self._get_client()
            await r.publish(channel, json.dumps(message, default=str))
        except Exception as exc:
            log.warning("message_bus_publish_failed channel=%s: %s", channel, exc)

    async def subscribe(self, channel: str):
        try:
            r = await self._get_client()
            pubsub = r.pubsub()
            await pubsub.subscribe(channel)
            return pubsub
        except Exception as exc:
            log.warning("message_bus_subscribe_failed channel=%s: %s", channel, exc)
            return None

    async def publish_handoff(self, alert_id: str, from_level: str, to_level: str, data: dict) -> None:
        channel = f"agent:handoff:{alert_id}"
        await self.publish(channel, {
            "from_level": from_level,
            "to_level": to_level,
            "alert_id": alert_id,
            **data,
        })

    async def publish_status(self, alert_id: str, level: str, status: str, metadata: dict = {}) -> None:
        channel = f"agent:status:{alert_id}"
        await self.publish(channel, {
            "level": level,
            "status": status,
            "alert_id": alert_id,
            **metadata,
        })

    async def broadcast_health(self, org_id: str, payload: dict) -> None:
        channel = f"agent:health:{org_id}"
        await self.publish(channel, payload)


# Singleton
message_bus = AgentMessageBus()
