"""
PhishSlayer Microsoft Graph MCP Server
Exposes Azure AD / Microsoft Graph identity tools as MCP tools.
Run: python server.py (port 9003)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../phishslayer-api"))

from mcp.server.fastmcp import FastMCP  # type: ignore[import]

mcp = FastMCP("phishslayer-graph", port=9003)


@mcp.tool()
def graph_get_signin_logs(user_id: str, org_id: str, limit: int = 50) -> dict:
    """Get recent Azure AD sign-in logs for a user."""
    try:
        from tools.identity.graph_tool import graph_get_signin_logs as _get
        return _get(user_id, org_id, limit)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def graph_revoke_session(user_id: str, org_id: str) -> dict:
    """Revoke all active sessions for a user (forces re-authentication)."""
    try:
        from tools.identity.graph_tool import graph_revoke_session as _revoke
        return _revoke(user_id, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def graph_device_compliance(user_id: str, org_id: str) -> dict:
    """Check device compliance status for all devices owned by a user."""
    try:
        from tools.identity.graph_tool import graph_device_compliance as _compliance
        return _compliance(user_id, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def graph_disable_account(user_id: str, org_id: str) -> dict:
    """Disable an Azure AD account (blocks all sign-ins)."""
    try:
        from tools.identity.graph_tool import graph_disable_account as _disable
        return _disable(user_id, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def graph_reset_mfa(user_id: str, org_id: str) -> dict:
    """Reset MFA methods for a user (forces MFA re-registration)."""
    try:
        from tools.identity.graph_tool import graph_reset_mfa as _mfa
        return _mfa(user_id, org_id)
    except Exception as e:
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    mcp.run()
