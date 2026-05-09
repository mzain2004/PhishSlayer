"""
AgentExecutor — entry point for all agent runs.
Wires pre_reply → agent.reply() → post_reply, manages AgentOps session,
and publishes SSE trace events to Redis pub/sub.
"""
from __future__ import annotations

import json
import os
import time
import traceback
from typing import Any

import agentops
import redis.asyncio as aioredis
from agentscope.message import Msg

from core.harness.base_agent import PhishSlayerBaseAgent
from observability.logger import AgentLogger


def _redis() -> aioredis.Redis:
    return aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


def _sse_channel(alert_id: str) -> str:
    return f"agent-trace:{alert_id}"


async def _publish(r: aioredis.Redis, alert_id: str, event: dict) -> None:
    await r.publish(_sse_channel(alert_id), json.dumps(event))


async def run_agent(
    agent: PhishSlayerBaseAgent,
    alert_id: str,
    org_id: str,
    payload: dict,
) -> dict:
    """
    Execute a PhishSlayer agent run end-to-end:
      1. Start AgentOps session
      2. pre_reply — load memory
      3. agent.reply — core LLM logic
      4. post_reply — persist results
      5. End AgentOps session
      6. Return final decision dict

    Publishes SSE events to Redis pub/sub at each stage.
    """
    import uuid as _uuid
    request_id = str(_uuid.uuid4())
    _log = AgentLogger(
        agent_level=agent.level,
        alert_id=alert_id,
        org_id=org_id,
        request_id=request_id,
    )

    session = agentops.start_session(tags=[agent.level, org_id])
    async with _redis() as r:
        try:
            _log.info("session_start")
            await _publish(r, alert_id, {"event": "start", "level": agent.level})

            # 1 — memory load
            context = await agent.pre_reply(alert_id, org_id)
            _log.info("memory_loaded", keys=list(context.keys()))
            await _publish(r, alert_id, {"event": "memory_loaded", "keys": list(context.keys())})

            # 2 — build input message
            msg_in = Msg(
                name="system",
                role="user",
                content={**payload, "context": context},
            )

            # 3 — agent core logic
            t0 = time.monotonic()
            msg_out = agent.reply(msg_in)
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            _log.info("reply_complete", duration_ms=elapsed_ms)
            await _publish(r, alert_id, {"event": "reply_complete", "elapsed_ms": elapsed_ms})

            # 4 — persist
            reasoning_trace = payload.get("reasoning_trace", [])
            await agent.post_reply(msg_out, alert_id, reasoning_trace)
            _log.info("persist_complete")
            await _publish(r, alert_id, {"event": "persisted"})

            decision = (
                msg_out.content
                if isinstance(msg_out.content, dict)
                else {"raw": str(msg_out.content)}
            )
            _log.info("session_complete", decision_keys=list(decision.keys()))
            await _publish(r, alert_id, {"event": "done", "decision": decision})
            agentops.end_session(session)
            return decision

        except Exception as exc:
            tb = traceback.format_exc()
            _log.error("session_error", error_code="AGENT_EXECUTION_FAILED")
            await _publish(r, alert_id, {"event": "error", "error": "AGENT_EXECUTION_FAILED"})
            agentops.end_session(session)
            raise RuntimeError("AGENT_EXECUTION_FAILED") from exc
