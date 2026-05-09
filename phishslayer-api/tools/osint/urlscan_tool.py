"""
URLScan.io OSINT tool — uses requests.
Returns plain dict (ToolDefinition-compatible).
Gracefully degrades on 401/429/timeout.
"""
from __future__ import annotations

import os
import time

import requests
from observability.logger import AgentLogger

_log = AgentLogger("l1", "", "", "")


_BASE_URL = "https://urlscan.io/api/v1"
_TIMEOUT = 10


def urlscan_submit(url: str) -> dict:
    """
    Submit a URL to URLScan.io for analysis.
    Returns the scan UUID for later retrieval.
    """
    api_key = os.getenv("URLSCAN_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "NO_API_KEY", "url": url}
    t0 = time.monotonic()
    try:
        resp = requests.post(
            f"{_BASE_URL}/scan/",
            headers={"API-Key": api_key, "Content-Type": "application/json"},
            json={"url": url, "visibility": "private"},
            timeout=_TIMEOUT,
        )
        if resp.status_code == 401:
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("urlscan", duration_ms=duration_ms, success=False, url=url)
            return {"status": "error", "error": "URLSCAN_AUTH_FAILED", "url": url}
        if resp.status_code == 429:
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("urlscan", duration_ms=duration_ms, success=False, url=url)
            return {"status": "error", "error": "URLSCAN_RATE_LIMITED", "url": url}
        resp.raise_for_status()
        data = resp.json()
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("urlscan", duration_ms=duration_ms, success=True, url=url)
        return {
            "status": "success",
            "url": url,
            "scan_id": data.get("uuid"),
            "result_url": data.get("result"),
            "api_url": data.get("api"),
        }
    except requests.Timeout:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("urlscan", duration_ms=duration_ms, success=False, url=url)
        return {"status": "error", "error": "URLSCAN_TIMEOUT", "url": url}
    except Exception:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("urlscan", duration_ms=duration_ms, success=False, url=url)
        return {"status": "error", "error": "URLSCAN_ERROR", "url": url}


def urlscan_get_result(scan_id: str) -> dict:
    """
    Poll for a previously submitted URLScan result.
    Retries up to 3 times with 5s delay.
    """
    api_key = os.getenv("URLSCAN_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "NO_API_KEY", "scan_id": scan_id}
    t0 = time.monotonic()
    for _ in range(3):
        try:
            resp = requests.get(
                f"{_BASE_URL}/result/{scan_id}/",
                headers={"API-Key": api_key},
                timeout=_TIMEOUT,
            )
            if resp.status_code == 404:
                time.sleep(5)
                continue
            if resp.status_code == 429:
                duration_ms = int((time.monotonic() - t0) * 1000)
                _log.tool_call("urlscan", duration_ms=duration_ms, success=False, scan_id=scan_id)
                return {"status": "error", "error": "URLSCAN_RATE_LIMITED", "scan_id": scan_id}
            resp.raise_for_status()
            data = resp.json()
            verdicts = data.get("verdicts", {}).get("overall", {})
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("urlscan", duration_ms=duration_ms, success=True, scan_id=scan_id)
            return {
                "status": "success",
                "scan_id": scan_id,
                "malicious": verdicts.get("malicious", False),
                "score": verdicts.get("score", 0),
                "categories": verdicts.get("categories", []),
                "screenshot": data.get("task", {}).get("screenshotURL"),
            }
        except requests.Timeout:
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("urlscan", duration_ms=duration_ms, success=False, scan_id=scan_id)
            return {"status": "error", "error": "URLSCAN_TIMEOUT", "scan_id": scan_id}
        except Exception:
            duration_ms = int((time.monotonic() - t0) * 1000)
            _log.tool_call("urlscan", duration_ms=duration_ms, success=False, scan_id=scan_id)
            return {"status": "error", "error": "URLSCAN_ERROR", "scan_id": scan_id}
    duration_ms = int((time.monotonic() - t0) * 1000)
    _log.tool_call("urlscan", duration_ms=duration_ms, success=False, scan_id=scan_id)
    return {"status": "error", "error": "URLSCAN_NOT_READY", "scan_id": scan_id}
