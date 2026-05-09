"""
PhishSlayer Wazuh MCP Server
Exposes Wazuh EDR tools as MCP tools.
Run: python server.py (port 9002)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../phishslayer-api"))

from mcp.server.fastmcp import FastMCP  # type: ignore[import]

mcp = FastMCP("phishslayer-wazuh", port=9002)


@mcp.tool()
def wazuh_get_alert(alert_id: str, org_id: str) -> dict:
    """Retrieve a Wazuh alert by ID for an organization."""
    try:
        from tools.edr.wazuh_tool import wazuh_get_alert as _get
        return _get(alert_id, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def wazuh_active_response(agent_id: str, command: str, org_id: str) -> dict:
    """
    Execute a Wazuh active response command on an endpoint.
    Commands: 'firewall-drop', 'firewall-undrop', 'disable-account', 'restart-wazuh'
    """
    try:
        from tools.edr.wazuh_tool import wazuh_active_response as _ar
        return _ar(agent_id, command, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def wazuh_get_agent(agent_id: str, org_id: str) -> dict:
    """Get Wazuh agent info (status, OS, last seen) for an endpoint."""
    try:
        from tools.edr.wazuh_tool import wazuh_get_agent as _ga
        return _ga(agent_id, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def wazuh_list_agents(org_id: str, status: str = "active") -> dict:
    """List all Wazuh agents for an organization."""
    try:
        from tools.edr.wazuh_tool import wazuh_list_agents as _la
        return _la(org_id, status)
    except Exception as e:
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    mcp.run()
