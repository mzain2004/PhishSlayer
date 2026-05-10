"""
VirusTotal OSINT tool — routes through MCP gateway.
"""
from __future__ import annotations

from core.harness.tool_client import call_tool


async def vt_check_ip(ip: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("virustotal", "check_ip", {"ip": ip}, org_id, request_id)


async def vt_check_url(url: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("virustotal", "check_url", {"url": url}, org_id, request_id)


async def vt_check_domain(domain: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("virustotal", "check_domain", {"domain": domain}, org_id, request_id)


async def vt_check_hash(file_hash: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("virustotal", "check_hash", {"hash": file_hash}, org_id, request_id)
