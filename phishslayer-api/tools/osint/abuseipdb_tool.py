"""
AbuseIPDB OSINT tool — uses requests.
Returns plain dict (ToolDefinition-compatible).
Gracefully degrades on 401/429/timeout.
"""
from __future__ import annotations

import os
import time

import requests
from observability.logger import AgentLogger

_log = AgentLogger("l1", "", "", "")


_BASE_URL = "https://api.abuseipdb.com/api/v2"
_TIMEOUT = 10


def abuseipdb_check(ip: str) -> dict:
    """
    Check an IP against AbuseIPDB.
    Returns abuse confidence score and report count.
    """
    api_key = os.getenv("ABUSEIPDB_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "NO_API_KEY", "ip": ip}
    t0 = time.monotonic()
    try:
        resp = requests.get(
            f"{_BASE_URL}/check",
            headers={"Key": api_key, "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 90},
            timeout=_TIMEOUT,
        )
        if resp.status_code == 401:
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("abuseipdb", duration_ms=duration_ms, success=False, ip=ip)
            return {"status": "error", "error": "ABUSEIPDB_AUTH_FAILED", "ip": ip}
        if resp.status_code == 429:
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("abuseipdb", duration_ms=duration_ms, success=False, ip=ip)
            return {"status": "error", "error": "ABUSEIPDB_RATE_LIMITED", "ip": ip}
        resp.raise_for_status()
        data = resp.json().get("data", {})
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("abuseipdb", duration_ms=duration_ms, success=True, ip=ip)
        return {
            "status": "success",
            "ip": ip,
            "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
            "total_reports": data.get("totalReports", 0),
            "country_code": data.get("countryCode", ""),
            "is_tor": data.get("isTor", False),
            "is_public": data.get("isPublic", True),
        }
    except requests.Timeout:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("abuseipdb", duration_ms=duration_ms, success=False, ip=ip)
        return {"status": "error", "error": "ABUSEIPDB_TIMEOUT", "ip": ip}
    except Exception:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("abuseipdb", duration_ms=duration_ms, success=False, ip=ip)
        return {"status": "error", "error": "ABUSEIPDB_ERROR", "ip": ip}
