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
from pydantic import BaseModel, ConfigDict, Field, field_validator
import os
import time as _time
import uuid as _uuid
import uuid

try:
    import agentops
    _AGENTOPS = True
except ImportError:
    agentops = None
    _AGENTOPS = False

try:
    import agentscope
    _AGENTSCOPE = True
except ImportError:
    agentscope = None
    _AGENTSCOPE = False
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


class OrgScopedRequest(BaseModel):
    org_id: str
    model_config = ConfigDict(extra="ignore")

    @field_validator("org_id")
    @classmethod
    def validate_org_id(cls, value: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("org_id must be a non-empty string")
        return value.strip()


class IngestAlertRequest(OrgScopedRequest):
    alert_id: str | None = None
    alert: dict = Field(default_factory=dict)


class InvestigateAlertRequest(OrgScopedRequest):
    alert_id: str
    attacker_intent: str
    mitre_techniques: list
    likely_next_move: str
    is_decoy_or_distraction: bool
    is_real_threat: bool
    confidence: float
    immediate_actions: list
    indicators_to_watch: list
    escalate_to_l2: bool
    requires_human_approval: bool
    verdict: str
    escalation_reason: str | None = None


class HuntAlertRequest(OrgScopedRequest):
    alert_id: str
    l2_result: dict = Field(default_factory=dict)


class SimulationRequest(OrgScopedRequest):
    rounds: int = 5


class GenerateReportRequest(OrgScopedRequest):
    case_id: str
    report_type: str = "tactical"


def _log_and_generic_error(op_name: str) -> JSONResponse:
    _api_log.exception("%s_failed", op_name)
    return JSONResponse({"error": "Internal server error"}, status_code=500)


def _start_agentops_session(org_id: str, alert_id: str) -> None:
    if not _AGENTOPS:
        return
    start_session = getattr(agentops, "start_session", None)
    if not callable(start_session):
        return
    try:
        session_id = f"{org_id}_{alert_id}_{uuid.uuid4()}"
        start_session(session_id=session_id)
    except Exception:
        _api_log.exception("agentops_session_start_failed")

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
    if _AGENTSCOPE:
        agentscope.init(project="phishslayer", name="api")
    init_agentops(api_key=app_settings.AGENTOPS_API_KEY, env=app_settings.ENV)

    # Start supervisor health-check background task
    from agents.orchestrator.supervisor import supervisor
    asyncio.create_task(supervisor.health_check())

    # Create IOC indexes on MongoDB startup
    _mongo_client = None
    mongodb_uri = os.getenv("MONGODB_URI")
    if mongodb_uri:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from db.ioc_indexes import create_ioc_indexes
            _mongo_client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=3000)
            await create_ioc_indexes(_mongo_client.get_database())
        except Exception as _ioc_err:
            _api_log.warning("ioc_index_creation_failed: %s", _ioc_err)

    _api_log.info("api_starting")
    yield
    if _AGENTOPS:
        agentops.end_all_sessions()
    if _mongo_client:
        _mongo_client.close()
    _api_log.info("api_stopping")


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
async def ingest_alert(request: IngestAlertRequest, current_user: dict = Depends(get_current_user)):
    try:
        org_id = request.org_id
        if current_user.get("org_id") and current_user.get("org_id") != org_id:
            return JSONResponse({"error": "Forbidden"}, status_code=403)

        alert_id = request.alert_id or str(uuid.uuid4())
        raw_alert = request.alert
        _start_agentops_session(org_id, alert_id)

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
    except Exception:
        return _log_and_generic_error("ingest_alert")

@app.post("/api/v1/alerts/investigate")
async def investigate_alert(request: InvestigateAlertRequest, current_user: dict = Depends(get_current_user)):
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

        if current_user.get("org_id") and current_user.get("org_id") != request.org_id:
            return JSONResponse({"error": "Forbidden"}, status_code=403)

        _start_agentops_session(request.org_id, request.alert_id)

        required = [
            "alert_id", "org_id", "attacker_intent", "mitre_techniques",
            "likely_next_move", "is_decoy_or_distraction", "is_real_threat",
            "confidence", "immediate_actions", "indicators_to_watch",
            "escalate_to_l2", "requires_human_approval", "verdict",
        ]
        request_data = request.model_dump()
        l1_result = TriageResult(
            **{k: request_data[k] for k in required},
            escalation_reason=request.escalation_reason,
        )
        hooks = LifecycleHooks()
        verify = VerifyInterface()
        state = StateStore()
        agent = L2InvestigatorAgent(lifecycle_hooks=hooks, verify=verify, state_store=state)
        result = await agent.investigate(l1_result, {"max_blast_radius": "medium"})
        return JSONResponse(asdict(result))
    except Exception:
        return _log_and_generic_error("investigate_alert")

@app.post("/api/v1/alerts/hunt")
async def hunt_alert(request: HuntAlertRequest, current_user: dict = Depends(get_current_user)):
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

        org_id = request.org_id
        if current_user.get("org_id") and current_user.get("org_id") != org_id:
            return JSONResponse({"error": "Forbidden"}, status_code=403)

        _start_agentops_session(org_id, request.alert_id)

        verify = VerifyInterface()
        state = StateStore()
        agent = L3HunterAgent(verify=verify, state_store=state)
        result = await agent.hunt(l2_result=request.l2_result, org_id=org_id)
        return JSONResponse(asdict(result))
    except Exception:
        return _log_and_generic_error("hunt_alert")

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
    except Exception:
        return _log_and_generic_error("get_alert_state")

@app.post("/api/v1/sim/decepticon")
async def run_simulation(request: SimulationRequest):
    """
    Runs a red-blue simulation.
    """
    try:
        from simulations.decepticon_sim import DecepticonSimulation
        rounds = request.rounds
        sim = DecepticonSimulation()
        report = await sim.run(rounds=rounds)
        return JSONResponse(report)
    except Exception:
        return _log_and_generic_error("run_simulation")

@app.get("/api/v1/cases/{case_id}/stix")
async def get_stix_bundle(case_id: str, current_user: dict = Depends(get_current_user)):
    """Return the STIX 2.1 bundle generated by L3 for a given alert/case."""
    try:
        from harness.state_store import StateStore
        org_id = current_user.get("org_id", "default")
        state = StateStore()
        doc = await state.get(case_id, org_id)
        if not doc:
            return JSONResponse({"error": "Not found"}, status_code=404)
        l3_result = doc.get("l3_result")
        if not l3_result:
            return JSONResponse({"error": "No hunt result available for this case"}, status_code=404)
        stix_bundle = l3_result.get("stix_bundle")
        if not stix_bundle:
            from services.stix_exporter import STIXExporter
            stix_bundle = STIXExporter().export_hunt_result(l3_result)
        if not stix_bundle:
            return JSONResponse({"error": "STIX export unavailable"}, status_code=503)
        return JSONResponse(stix_bundle)
    except Exception:
        return _log_and_generic_error("get_stix_bundle")


@app.post("/api/v1/reports/generate")
async def generate_report(request: GenerateReportRequest, current_user: dict = Depends(get_current_user)):
    """Generate a tactical/operational/strategic report from hunt findings."""
    try:
        from harness.state_store import StateStore
        from services.report_generator import ReportGenerator

        if current_user.get("org_id") and current_user.get("org_id") != request.org_id:
            return JSONResponse({"error": "Forbidden"}, status_code=403)

        state = StateStore()
        doc = await state.get(request.case_id, request.org_id)
        if not doc:
            return JSONResponse({"error": "Not found"}, status_code=404)
        l3_result = doc.get("l3_result")
        if not l3_result:
            return JSONResponse({"error": "No hunt result available for this case"}, status_code=404)

        generator = ReportGenerator()
        report = await generator.generate(l3_result, request.report_type, request.org_id)
        return JSONResponse(report)
    except Exception:
        return _log_and_generic_error("generate_report")


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
    _api_log.exception("unhandled_exception")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV", "development") == "development"
    )
