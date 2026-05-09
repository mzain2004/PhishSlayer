"""
Supervisor agent: sits above L1/L2/L3.
Routes alerts, monitors health, kills stuck agents, escalates on timeout.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

TIMEOUTS = {"l1": 30, "l2": 60, "l3": 300}


@dataclass
class AgentTask:
    alert_id: str
    org_id: str
    level: str
    started_at: datetime
    task: asyncio.Task


class SupervisorAgent:
    def __init__(self):
        self.active_tasks: dict[str, AgentTask] = {}
        self.health_check_interval = 10

    async def dispatch(self, alert_id: str, org_id: str, raw_alert: dict) -> dict:
        level = self._classify_entry_level(raw_alert)

        # Org-level L3 concurrency cap: max 3 simultaneous hunts per org
        org_l3_count = sum(
            1 for t in self.active_tasks.values()
            if t.org_id == org_id and t.level == "l3"
        )
        if level == "l3" and org_l3_count >= 3:
            level = "l2"

        task = asyncio.create_task(self._run_agent(alert_id, org_id, level))
        self.active_tasks[alert_id] = AgentTask(
            alert_id=alert_id,
            org_id=org_id,
            level=level,
            started_at=datetime.utcnow(),
            task=task,
        )
        log.info("supervisor_dispatch", extra={"alert_id": alert_id, "level": level, "org_id": org_id})
        return {"alert_id": alert_id, "dispatched_level": level}

    async def _run_agent(self, alert_id: str, org_id: str, level: str) -> dict:
        timeout = TIMEOUTS[level]
        try:
            result = await asyncio.wait_for(
                self._execute_agent(alert_id, org_id, level),
                timeout=timeout,
            )
            return result
        except asyncio.TimeoutError:
            log.error("agent_timeout", extra={"alert_id": alert_id, "level": level})
            if level == "l1":
                return await self._execute_agent(alert_id, org_id, "l2")
            elif level == "l2":
                return await self._execute_agent(alert_id, org_id, "l3")
            else:
                return {"status": "timeout", "requires_human": True, "alert_id": alert_id}
        finally:
            self.active_tasks.pop(alert_id, None)

    async def _execute_agent(self, alert_id: str, org_id: str, level: str) -> dict:
        """Dispatch to the appropriate agent level."""
        import httpx
        import os
        api_url = os.getenv("PYTHON_API_URL", "http://localhost:8000")
        async with httpx.AsyncClient(timeout=TIMEOUTS[level] + 5) as client:
            resp = await client.post(
                f"{api_url}/agents/{level}",
                json={"alert_id": alert_id, "org_id": org_id},
            )
            resp.raise_for_status()
            return resp.json()

    def _classify_entry_level(self, raw_alert: dict) -> str:
        severity = raw_alert.get("rule", {}).get("level", 0)
        try:
            severity = int(severity)
        except (TypeError, ValueError):
            severity = 0
        if severity >= 12:
            return "l3"
        elif severity >= 8:
            return "l2"
        return "l1"

    async def health_check(self) -> None:
        """Periodically kill stuck agents (2x timeout)."""
        while True:
            now = datetime.utcnow()
            for alert_id, agent_task in list(self.active_tasks.items()):
                elapsed = (now - agent_task.started_at).total_seconds()
                timeout = TIMEOUTS[agent_task.level]
                if elapsed > timeout * 2:
                    agent_task.task.cancel()
                    self.active_tasks.pop(alert_id, None)
                    log.error("agent_killed_stuck", extra={"alert_id": alert_id, "level": agent_task.level})
            await asyncio.sleep(self.health_check_interval)


# Singleton
supervisor = SupervisorAgent()
