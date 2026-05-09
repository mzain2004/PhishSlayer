"""
wazuh_tool.py — Wazuh REST API tools for L2 responder.

Uses org-specific Wazuh endpoint from organizations table.
All calls: 10s timeout, graceful degradation on 401/429/timeout.
blast_radius for active-response: device.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

log = logging.getLogger(__name__)
TIMEOUT = 10


def _get_org_wazuh(org_id: str) -> Optional[dict]:
    """
    Retrieve org-specific Wazuh endpoint + credentials from Supabase organizations table.
    Returns None if not configured.
    """
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            return None
        sb = create_client(url, key)
        row = (
            sb.table("organizations")
            .select("wazuh_url,wazuh_token")
            .eq("id", org_id)
            .single()
            .execute()
        )
        if row.data and row.data.get("wazuh_url"):
            return {"url": row.data["wazuh_url"], "token": row.data.get("wazuh_token", "")}
        return None
    except Exception as e:
        log.warning("_get_org_wazuh failed for org %s: %s", org_id, e)
        return None


def _wazuh_headers(org_id: str) -> tuple[str, dict]:
    """Returns (base_url, headers). Raises PermissionError if not configured."""
    cfg = _get_org_wazuh(org_id)
    if not cfg:
        raise PermissionError(f"No Wazuh integration configured for org {org_id}")
    headers = {"Authorization": f"Bearer {cfg['token']}", "Content-Type": "application/json"}
    return cfg["url"].rstrip("/"), headers


def wazuh_get_alert(alert_id: str, org_id: str) -> dict:
    """Retrieve raw alert data from Wazuh by alert ID."""
    try:
        base, headers = _wazuh_headers(org_id)
        resp = requests.get(
            f"{base}/alerts/{alert_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        if resp.status_code == 401:
            return {"error": "AUTH_FAILED"}
        if resp.status_code == 404:
            return {"error": "ALERT_NOT_FOUND", "alert_id": alert_id}
        resp.raise_for_status()
        return resp.json()
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("wazuh_get_alert failed: %s", e)
        return {"error": "WAZUH_FAILED"}


def wazuh_active_response(agent_id: str, command: str, org_id: str) -> dict:
    """
    Execute Wazuh active response command on an agent.
    blast_radius: device. Requires human approval if blast_radius >= org.
    """
    allowed_commands = {"block", "unblock", "restart", "kill"}
    if command not in allowed_commands:
        return {"error": "INVALID_COMMAND", "allowed": list(allowed_commands)}

    try:
        base, headers = _wazuh_headers(org_id)
        resp = requests.put(
            f"{base}/active-response",
            headers=headers,
            json={"command": command, "agents_list": [agent_id]},
            timeout=TIMEOUT,
        )
        if resp.status_code == 401:
            return {"error": "AUTH_FAILED"}
        if resp.status_code == 429:
            return {"error": "RATE_LIMITED"}
        resp.raise_for_status()
        return {"status": "active_response_sent", "agent_id": agent_id, "command": command}
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("wazuh_active_response failed: %s", e)
        return {"error": "WAZUH_FAILED"}


def wazuh_get_agent_info(agent_id: str, org_id: str) -> dict:
    """Get Wazuh agent metadata (OS, status, last keepalive)."""
    try:
        base, headers = _wazuh_headers(org_id)
        resp = requests.get(
            f"{base}/agents",
            headers=headers,
            params={"agents_list": agent_id},
            timeout=TIMEOUT,
        )
        if resp.status_code == 401:
            return {"error": "AUTH_FAILED"}
        resp.raise_for_status()
        data = resp.json()
        agents = data.get("data", {}).get("affected_items", [])
        return agents[0] if agents else {"error": "AGENT_NOT_FOUND"}
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("wazuh_get_agent_info failed: %s", e)
        return {"error": "WAZUH_FAILED"}
