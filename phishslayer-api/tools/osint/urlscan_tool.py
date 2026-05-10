"""
URLScan.io OSINT tool — routes through MCP gateway.
"""
from __future__ import annotations

from core.harness.tool_client import call_tool


async def urlscan_submit(url: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("urlscan", "submit", {"url": url}, org_id, request_id)


async def urlscan_get_result(scan_id: str, org_id: str = "system", request_id: str = "") -> dict:
    return await call_tool("urlscan", "get_result", {"scan_id": scan_id}, org_id, request_id)
