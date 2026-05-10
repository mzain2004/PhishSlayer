"""
Deep OSINT — human-level intelligence gathering.
Combines multiple sources into a unified entity profile via MCP gateway.
All lookups run in parallel via asyncio.gather with return_exceptions=True.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from core.harness.tool_client import call_tool

log = logging.getLogger(__name__)


class DeepOSINT:
    # -----------------------------------------------------------------------
    # IP investigation
    # -----------------------------------------------------------------------

    async def investigate_ip(self, ip: str, org_id: str = "system") -> dict:
        results = await asyncio.gather(
            call_tool("virustotal", "check_ip", {"ip": ip}, org_id),
            call_tool("abuseipdb", "check_ip", {"ip": ip}, org_id),
            call_tool("shodan", "host_lookup", {"ip": ip}, org_id),
            call_tool("greynoise", "check_ip", {"ip": ip}, org_id),
            call_tool("whois", "lookup", {"target": ip}, org_id),
            call_tool("passivedns", "lookup_ip", {"ip": ip}, org_id),
            return_exceptions=True,
        )
        keys = ["virustotal", "abuseipdb", "shodan", "greynoise", "whois", "passive_dns"]
        return self._merge(keys, results)

    # -----------------------------------------------------------------------
    # Domain investigation
    # -----------------------------------------------------------------------

    async def investigate_domain(self, domain: str, org_id: str = "system") -> dict:
        results = await asyncio.gather(
            call_tool("virustotal", "check_domain", {"domain": domain}, org_id),
            call_tool("urlscan", "submit", {"url": f"https://{domain}"}, org_id),
            call_tool("whois", "lookup", {"target": domain}, org_id),
            call_tool("crtsh", "search_domain", {"domain": domain}, org_id),
            call_tool("hibp", "check_domain", {"domain": domain}, org_id),
            call_tool("passivedns", "lookup_domain", {"domain": domain}, org_id),
            return_exceptions=True,
        )
        keys = ["virustotal", "urlscan", "whois", "crt_sh", "hibp", "passive_dns"]
        return self._merge(keys, results)

    # -----------------------------------------------------------------------
    # Email investigation
    # -----------------------------------------------------------------------

    async def investigate_email(self, email: str, org_id: str = "system") -> dict:
        results = await asyncio.gather(
            call_tool("hibp", "check_email", {"email": email}, org_id),
            call_tool("hunter", "verify_email", {"email": email}, org_id),
            return_exceptions=True,
        )
        keys = ["hibp", "hunter_io"]
        return self._merge(keys, results)

    # -----------------------------------------------------------------------
    # Hash investigation
    # -----------------------------------------------------------------------

    async def investigate_hash(self, file_hash: str, org_id: str = "system") -> dict:
        results = await asyncio.gather(
            call_tool("virustotal", "check_hash", {"hash": file_hash}, org_id),
            call_tool("malwarebazaar", "lookup_hash", {"hash": file_hash}, org_id),
            call_tool("threatfox", "search_ioc", {"ioc": file_hash}, org_id),
            return_exceptions=True,
        )
        keys = ["virustotal", "malwarebazaar", "threatfox"]
        return self._merge(keys, results)

    # -----------------------------------------------------------------------
    # Helper
    # -----------------------------------------------------------------------

    def _merge(self, keys: list[str], results: list[Any]) -> dict:
        return {
            key: ({"status": "error", "error": str(r)} if isinstance(r, Exception) else r)
            for key, r in zip(keys, results)
        }


deep_osint = DeepOSINT()
