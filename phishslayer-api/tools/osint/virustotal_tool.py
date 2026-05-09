"""
VirusTotal OSINT tool — uses vt-py SDK.
Returns plain dict (ToolDefinition-compatible).
Gracefully degrades on 401/429/timeout.
"""
from __future__ import annotations

import os
import time

import vt
from observability.logger import AgentLogger

_log = AgentLogger("l1", "", "", "")


def vt_check_ip(ip: str) -> dict:
    """
    Query VirusTotal for IP reputation.
    Returns malicious/suspicious/harmless engine counts.
    """
    api_key = os.getenv("VIRUSTOTAL_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "NO_API_KEY", "ip": ip}
    t0 = time.monotonic()
    try:
        with vt.Client(api_key, timeout=10) as client:
            obj = client.get_object(f"/ip_addresses/{ip}")
            stats = obj.last_analysis_stats
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("virustotal", duration_ms=duration_ms, success=True, target=ip, target_type="ip")
            return {
                "status": "success",
                "ip": ip,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "undetected": stats.get("undetected", 0),
                "reputation": obj.reputation,
            }
    except vt.APIError as e:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("virustotal", duration_ms=duration_ms, success=False, target=ip, target_type="ip")
        code = e.code if hasattr(e, "code") else "UNKNOWN"
        if code in ("AuthenticationRequiredError", "WrongCredentialsError"):
            return {"status": "error", "error": "VT_AUTH_FAILED", "ip": ip}
        if code == "QuotaExceededError":
            return {"status": "error", "error": "VT_QUOTA_EXCEEDED", "ip": ip}
        return {"status": "error", "error": "VT_API_ERROR", "ip": ip}
    except Exception:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("virustotal", duration_ms=duration_ms, success=False, target=ip, target_type="ip")
        return {"status": "error", "error": "VT_TIMEOUT", "ip": ip}


def vt_check_url(url: str) -> dict:
    """Query VirusTotal for URL reputation."""
    api_key = os.getenv("VIRUSTOTAL_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "NO_API_KEY", "url": url}
    t0 = time.monotonic()
    try:
        with vt.Client(api_key, timeout=10) as client:
            url_id = vt.url_id(url)
            obj = client.get_object(f"/urls/{url_id}")
            stats = obj.last_analysis_stats
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("virustotal", duration_ms=duration_ms, success=True, target=url, target_type="url")
            return {
                "status": "success",
                "url": url,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
            }
    except vt.APIError as e:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("virustotal", duration_ms=duration_ms, success=False, target=url, target_type="url")
        code = e.code if hasattr(e, "code") else "UNKNOWN"
        if code == "QuotaExceededError":
            return {"status": "error", "error": "VT_QUOTA_EXCEEDED", "url": url}
        return {"status": "error", "error": "VT_API_ERROR", "url": url}
    except Exception:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("virustotal", duration_ms=duration_ms, success=False, target=url, target_type="url")
        return {"status": "error", "error": "VT_TIMEOUT", "url": url}
