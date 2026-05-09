# FILE: phishslayer-api/main.py
# FastAPI application entry point
# Mounts all router modules and configures middleware

from dotenv import load_dotenv
from pathlib import Path

# Correct — resolves absolute path first
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
import os
import time as _time
import uuid as _uuid
import agentops
import agentscope
import uuid
from agents.l1_triage import L1TriageAgent, TriageResult
from harness.lifecycle_hooks import LifecycleHooks
from harness.verify_interface import VerifyInterface
from harness.state_store import StateStore
from middleware.auth_dependency import get_current_user
from config.settings import settings as app_settings
from observability.agentops_client import init_agentops
from observability.logger import get_logger
from dataclasses import asdict

_api_log = get_logger("phishslayer.api")

# Import all routers
from routers import (
    alerts, cases, connectors, detection, hunting, intel, metrics,
    osint, playbooks, sigma, settings, assets, ingest, mitre, cron,
    users, wazuh, incidents, health, soc
)
from routes.wazuh_webhook import router as wazuh_router
from routes.agent_dispatch import router as agent_dispatch_router

# Lifecycle events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown"""
    agentscope.init(project="phishslayer", name="api")
    init_agentops(api_key=app_settings.AGENTOPS_API_KEY, env=app_settings.ENV)

    # Start supervisor health-check background task
    from agents.orchestrator.supervisor import supervisor
    asyncio.create_task(supervisor.health_check())

    print("PhishSlayer API starting...")
    yield
    agentops.end_all_sessions()
    print("PhishSlayer API shutting down...")


# Create FastAPI app
app = FastAPI(
    title="PhishSlayer API",
    description="Python backend for PhishSlayer SOC platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("x-request-id", str(_uuid.uuid4()))
        start = _time.time()
        _api_log.info(
            "request_start",
            extra={"request_id": request_id, "metadata": {"method": request.method, "path": request.url.path}},
        )
        response = await call_next(request)
        duration_ms = int((_time.time() - start) * 1000)
        _api_log.info(
            "request_complete",
            extra={
                "request_id": request_id,
                "duration_ms": duration_ms,
                "metadata": {"status_code": response.status_code},
            },
        )
        response.headers["x-request-id"] = request_id
        return response


app.add_middleware(StructuredLoggingMiddleware)

# Mount all routers with their prefixes
# Core SOC functionality
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(soc.router, prefix="/api/soc", tags=["SOC"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])

# Detection & Rules
app.include_router(detection.router, prefix="/api/detection-rules", tags=["Detection"])
app.include_router(sigma.router, prefix="/api/sigma", tags=["Sigma"])

# Intelligence & Threat Analysis
app.include_router(intel.router, prefix="/api/tip", tags=["Threat Intelligence"])
app.include_router(mitre.router, prefix="/api/mitre", tags=["MITRE ATT&CK"])
app.include_router(hunting.router, prefix="/api/hunting", tags=["Threat Hunting"])
app.include_router(osint.router, prefix="/api/osint", tags=["OSINT"])

# Infrastructure & Integrations
app.include_router(connectors.router, prefix="/api/connectors", tags=["Connectors"])
app.include_router(wazuh.router, prefix="/api/wazuh", tags=["Wazuh"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])

# Data & Operations
app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingestion"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(playbooks.router, prefix="/api/playbooks", tags=["Playbooks"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(cron.router, prefix="/api/cron", tags=["Cron Jobs"])
app.include_router(wazuh_router)
app.include_router(agent_dispatch_router, tags=["Agent Dispatch"])

@app.post("/api/v1/alerts/ingest")
async def ingest_alert(request: dict, current_user: dict = Depends(get_current_user)):
    try:
        org_id = current_user.get("org_id", "default")
        alert_id = request.get("alert_id", str(uuid.uuid4()))
        raw_alert = request.get("alert", {})

        hooks = LifecycleHooks()
        verify = VerifyInterface()
        state = StateStore()
        agent = L1TriageAgent(lifecycle_hooks=hooks, verify=verify, state_store=state)

        result = await agent.triage(
            alert_id=alert_id,
            org_id=org_id,
            raw_alert=raw_alert
        )
        from dataclasses import asdict
        return JSONResponse(asdict(result))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/v1/alerts/investigate")
async def investigate_alert(request: dict, current_user: dict = Depends(get_current_user)):
    """
    L2 investigation endpoint.
    Accepts L1 TriageResult JSON as body.
    Returns InvestigationResult JSON.
    """
    try:
        from agents.l1_triage import TriageResult
        from agents.l2_investigator import L2InvestigatorAgent, InvestigationResult
        from harness.lifecycle_hooks import LifecycleHooks
        from harness.verify_interface import VerifyInterface
        from harness.state_store import StateStore
        from dataclasses import asdict

        required = ["alert_id","org_id","attacker_intent","mitre_techniques",
                    "likely_next_move","is_decoy_or_distraction","is_real_threat",
                    "confidence","immediate_actions","indicators_to_watch",
                    "escalate_to_l2","requires_human_approval","verdict"]
        missing = [f for f in required if f not in request]
        if missing:
            return JSONResponse(
                {"error": f"Missing fields: {missing}"}, status_code=400
            )

        l1_result = TriageResult(**{k: request[k] for k in required},
                                  escalation_reason=request.get("escalation_reason"))
        hooks = LifecycleHooks()
        verify = VerifyInterface()
        state = StateStore()
        agent = L2InvestigatorAgent(lifecycle_hooks=hooks, verify=verify, state_store=state)
        result = await agent.investigate(l1_result, {"max_blast_radius": "medium"})
        return JSONResponse(asdict(result))
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/v1/alerts/hunt")
async def hunt_alert(request: dict, current_user: dict = Depends(get_current_user)):
    """
    L3 hunter endpoint.
    Accepts L2 InvestigationResult JSON as body.
    Returns HuntResult JSON.
    """
    try:
        from agents.l3_hunter import L3HunterAgent, HuntResult
        from harness.verify_interface import VerifyInterface
        from harness.state_store import StateStore
        from dataclasses import asdict

        org_id = current_user.get("org_id", "default")

        verify = VerifyInterface()
        state = StateStore()
        agent = L3HunterAgent(verify=verify, state_store=state)
        result = await agent.hunt(l2_result=request, org_id=org_id)
        return JSONResponse(asdict(result))
    except Exception as e:
        return JSONResponse(
            {"error": str(e)}, status_code=500
        )

@app.get("/api/v1/alerts/{alert_id}/state")
async def get_alert_state(alert_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns full state doc from MongoDB for that alert.
    """
    try:
        from harness.state_store import StateStore
        org_id = current_user.get("org_id", "default")
        state = StateStore()
        doc = await state.get(alert_id, org_id)
        if not doc:
            return JSONResponse({"error": "Alert state not found"}, status_code=404)
        return JSONResponse(doc)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/v1/sim/decepticon")
async def run_simulation(request: dict):
    """
    Runs a red-blue simulation.
    """
    try:
        from simulations.decepticon_sim import DecepticonSimulation
        rounds = request.get("rounds", 5)
        sim = DecepticonSimulation()
        report = await sim.run(rounds=rounds)
        return JSONResponse(report)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "PhishSlayer API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV", "development") == "development"
    )
