"""
Agent dispatch routes — all incoming alerts route through SupervisorAgent.
Provides /agents/dispatch endpoint and supervisor health endpoint.
"""
from __future__ import annotations

import logging
import uuid
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from agents.orchestrator.supervisor import supervisor

log = logging.getLogger(__name__)

router = APIRouter()


@router.post("/agents/dispatch")
async def dispatch_alert(request: Request):
    """
    Primary dispatch endpoint for all alerts.
    SupervisorAgent classifies severity and routes to L1/L2/L3.
    Returns 202 Accepted with dispatched level.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    alert_id = payload.get("alert_id") or str(uuid.uuid4())
    org_id = payload.get("org_id", "default")
    raw_alert = payload.get("raw_alert", payload)

    result = await supervisor.dispatch(alert_id, org_id, raw_alert)
    return JSONResponse(result, status_code=202)


@router.get("/agents/supervisor/health")
async def supervisor_health():
    """Return count of active agent tasks per level."""
    by_level: dict[str, int] = {"l1": 0, "l2": 0, "l3": 0}
    for task in supervisor.active_tasks.values():
        by_level[task.level] = by_level.get(task.level, 0) + 1
    return {"active_tasks": by_level, "total": len(supervisor.active_tasks)}
