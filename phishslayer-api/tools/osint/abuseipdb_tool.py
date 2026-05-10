"""
AbuseIPDB OSINT tool — routes through MCP gateway.
"""
from __future__ import annotations

from core.harness.tool_client import call_tool


async def abuseipdb_check(ip: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("abuseipdb", "check_ip", {"ip": ip}, org_id, request_id)
