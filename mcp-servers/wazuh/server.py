"""
PhishSlayer Wazuh MCP Server
Exposes Wazuh EDR tools as MCP tools.
Run: python server.py (port 9002)
"""
import sys
import os
import logging
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../phishslayer-api"))
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

from mcp.server.fastmcp import FastMCP  # type: ignore[import]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("mcp_server.wazuh")


def _require_org_id(org_id: str) -> str:
    if not isinstance(org_id, str) or not org_id.strip():
        raise ValueError("org_id must be a non-empty string")
    return org_id.strip()


def _error_response(operation: str) -> dict:
    log.exception("%s_failed", operation)
    return {"status": "error", "error": "Internal server error"}

mcp = FastMCP("phishslayer-wazuh", port=9002)


@mcp.tool()
def wazuh_get_alert(alert_id: str, org_id: str) -> dict:
    """Retrieve a Wazuh alert by ID for an organization."""
    try:
        org_id = _require_org_id(org_id)
        from tools.edr.wazuh_tool import wazuh_get_alert as _get
        return _get(alert_id, org_id)
    except Exception:
        return _error_response("wazuh_get_alert")


@mcp.tool()
def wazuh_active_response(agent_id: str, command: str, org_id: str) -> dict:
    """
    Execute a Wazuh active response command on an endpoint.
    Commands: 'firewall-drop', 'firewall-undrop', 'disable-account', 'restart-wazuh'
    """
    try:
        org_id = _require_org_id(org_id)
        from tools.edr.wazuh_tool import wazuh_active_response as _ar
        return _ar(agent_id, command, org_id)
    except Exception:
        return _error_response("wazuh_active_response")


@mcp.tool()
def wazuh_get_agent(agent_id: str, org_id: str) -> dict:
    """Get Wazuh agent info (status, OS, last seen) for an endpoint."""
    try:
        org_id = _require_org_id(org_id)
        from tools.edr.wazuh_tool import wazuh_get_agent as _ga
        return _ga(agent_id, org_id)
    except Exception:
        return _error_response("wazuh_get_agent")


@mcp.tool()
def wazuh_list_agents(org_id: str, status: str = "active") -> dict:
    """List all Wazuh agents for an organization."""
    try:
        org_id = _require_org_id(org_id)
        from tools.edr.wazuh_tool import wazuh_list_agents as _la
        return _la(org_id, status)
    except Exception:
        return _error_response("wazuh_list_agents")


if __name__ == "__main__":
    mcp.run()
