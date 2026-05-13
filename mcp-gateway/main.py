"""
PhishSlayer MCP Gateway
Single entry point for all tool MCP servers.
Resolves org credentials: org key > PhishSlayer default key.
"""
import os
import base64
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pydantic import BaseModel, ConfigDict, Field, field_validator

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

from tools import (
    virustotal_tool, shodan_tool, abuseipdb_tool,
    urlscan_tool, greynoise_tool, hibp_tool,
    hunter_tool, otx_tool, crtsh_tool, urlhaus_tool,
    threatfox_tool, malwarebazaar_tool, passivedns_tool,
    misp_tool, opencti_tool, whois_tool, censys_tool,
)

log = logging.getLogger("mcp_gateway")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ---------------------------------------------------------------------------
# Supabase client (optional — gateway still works without it, uses defaults)
# ---------------------------------------------------------------------------
_supabase = None
_supabase_url = os.environ.get("SUPABASE_URL", "")
_supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if _supabase_url and _supabase_key:
    try:
        from supabase import create_client
        _supabase = create_client(_supabase_url, _supabase_key)
        log.info("Supabase connected")
    except Exception as exc:
        log.warning("Supabase unavailable: %s", exc)

# ---------------------------------------------------------------------------
# PhishSlayer shared default keys
# ---------------------------------------------------------------------------
DEFAULT_KEYS: dict[str, str | None] = {
    "virustotal":    os.environ.get("DEFAULT_VT_API_KEY"),
    "shodan":        os.environ.get("DEFAULT_SHODAN_API_KEY"),
    "greynoise":     os.environ.get("DEFAULT_GREYNOISE_API_KEY"),
    "hibp":          os.environ.get("DEFAULT_HIBP_API_KEY"),
    "hunter":        os.environ.get("DEFAULT_HUNTER_API_KEY"),
    "abuseipdb":     os.environ.get("DEFAULT_ABUSEIPDB_API_KEY"),
    "otx":           os.environ.get("DEFAULT_OTX_API_KEY"),
    "urlscan":       os.environ.get("DEFAULT_URLSCAN_API_KEY"),
    "censys":        os.environ.get("DEFAULT_CENSYS_API_KEY"),
    "misp":          os.environ.get("DEFAULT_MISP_URL"),
    "opencti":       os.environ.get("DEFAULT_OPENCTI_URL"),
    # Free / no key required
    "crtsh":         "no_key_needed",
    "urlhaus":       "no_key_needed",
    "threatfox":     "no_key_needed",
    "malwarebazaar": "no_key_needed",
    "passivedns":    "no_key_needed",
    "whois":         "no_key_needed",
}

TOOL_REGISTRY = {
    "virustotal":    virustotal_tool.invoke,
    "shodan":        shodan_tool.invoke,
    "abuseipdb":     abuseipdb_tool.invoke,
    "urlscan":       urlscan_tool.invoke,
    "greynoise":     greynoise_tool.invoke,
    "hibp":          hibp_tool.invoke,
    "hunter":        hunter_tool.invoke,
    "otx":           otx_tool.invoke,
    "crtsh":         crtsh_tool.invoke,
    "urlhaus":       urlhaus_tool.invoke,
    "threatfox":     threatfox_tool.invoke,
    "malwarebazaar": malwarebazaar_tool.invoke,
    "passivedns":    passivedns_tool.invoke,
    "misp":          misp_tool.invoke,
    "opencti":       opencti_tool.invoke,
    "whois":         whois_tool.invoke,
    "censys":        censys_tool.invoke,
}

_ENCRYPTION_KEY_B64 = os.environ.get("CREDENTIAL_ENCRYPTION_KEY", "")


class OrgScopedRequest(BaseModel):
    org_id: str
    model_config = ConfigDict(extra="ignore")

    @field_validator("org_id")
    @classmethod
    def validate_org_id(cls, value: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("org_id must be a non-empty string")
        return value.strip()


class InvokeToolRequest(OrgScopedRequest):
    payload: dict = Field(default_factory=dict)
    request_id: str = ""


class ListToolsRequest(OrgScopedRequest):
    pass


def _decrypt_cred(encrypted: str) -> str:
    raw = base64.b64decode(encrypted)
    nonce = raw[:12]
    ct_with_tag = raw[12:]
    key = base64.b64decode(_ENCRYPTION_KEY_B64)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct_with_tag, None).decode()


def _get_org_key(org_id: str, tool_name: str) -> str:
    """Return org's custom key if set and enabled, else PhishSlayer default."""
    if _supabase and org_id and org_id != "system":
        try:
            result = (
                _supabase.table("org_integrations")
                .select("encrypted_credentials, enabled")
                .eq("org_id", org_id)
                .eq("tool_name", tool_name)
                .eq("enabled", True)
                .single()
                .execute()
            )
            if result.data and result.data.get("encrypted_credentials"):
                creds = result.data["encrypted_credentials"]
                if isinstance(creds, dict) and creds.get("api_key") and _ENCRYPTION_KEY_B64:
                    return _decrypt_cred(creds["api_key"])
        except Exception:
            log.exception("org_key_lookup_failed")
            pass  # fall through to default

    return DEFAULT_KEYS.get(tool_name) or ""


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("MCP Gateway starting on :9000")
    yield
    log.info("MCP Gateway stopping")


app = FastAPI(title="PhishSlayer MCP Gateway", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "tools": list(TOOL_REGISTRY.keys())}


@app.post("/mcp/{tool_name}/invoke")
async def invoke_tool(
    tool_name: str,
    request: InvokeToolRequest,
):
    org_id = request.org_id
    api_key = _get_org_key(org_id, tool_name)
    if not api_key:
        raise HTTPException(404, "Tool not configured")

    handler = TOOL_REGISTRY.get(tool_name)
    if not handler:
        raise HTTPException(404, "Tool not found")

    try:
        result = await handler(request.payload, api_key)
    except HTTPException:
        raise
    except Exception:
        log.exception("tool_invoke_failed", extra={"tool_name": tool_name, "org_id": org_id})
        raise HTTPException(500, "Internal server error")

    if _supabase:
        try:
            _supabase.table("tool_call_logs").insert({
                "org_id": org_id,
                "tool_name": tool_name,
                "success": result.get("status") == "success",
                "request_id": request.request_id,
            }).execute()
        except Exception:
            log.exception("tool_call_log_write_failed")
            pass

    return result


@app.post("/mcp/tools")
async def list_tools(request: ListToolsRequest):
    org_id = request.org_id
    tools = []
    for tool_name in DEFAULT_KEYS:
        has_custom = False
        if _supabase:
            try:
                r = (
                    _supabase.table("org_integrations")
                    .select("id")
                    .eq("org_id", org_id)
                    .eq("tool_name", tool_name)
                    .eq("enabled", True)
                    .execute()
                )
                has_custom = bool(r.data)
            except Exception:
                log.exception("list_tools_lookup_failed", extra={"tool_name": tool_name, "org_id": org_id})
                pass
        tools.append({
            "name": tool_name,
            "available": True,
            "using_custom_key": has_custom,
            "using_phishslayer_key": not has_custom,
        })
    return {"tools": tools}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
