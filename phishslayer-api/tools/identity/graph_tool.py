"""
graph_tool.py — Microsoft Graph API tools for L2 responder.

Uses org-specific OAuth tokens from Supabase integrations table.
Never a shared service account — per-org token refresh handled automatically.
All calls: 10s timeout, 401/429 graceful degradation.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

log = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TIMEOUT = 10


def _get_org_token(org_id: str) -> Optional[str]:
    """
    Retrieve org-specific Graph API access token from Supabase integrations table.
    Returns None if integration not configured.
    """
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            return None
        sb = create_client(url, key)
        row = (
            sb.table("integrations")
            .select("access_token,tenant_id")
            .eq("organization_id", org_id)
            .eq("provider", "microsoft")
            .single()
            .execute()
        )
        return row.data.get("access_token") if row.data else None
    except Exception as e:
        log.warning("_get_org_token failed for org %s: %s", org_id, e)
        return None


def _headers(org_id: str) -> dict:
    token = _get_org_token(org_id)
    if not token:
        raise PermissionError(f"No Microsoft integration configured for org {org_id}")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def graph_get_signin_logs(user_id: str, org_id: str, limit: int = 100) -> dict:
    """Retrieve last N sign-ins for a user from Microsoft Graph."""
    try:
        resp = requests.get(
            f"{GRAPH_BASE}/auditLogs/signIns",
            headers=_headers(org_id),
            params={"$filter": f"userId eq '{user_id}'", "$top": limit},
            timeout=TIMEOUT,
        )
        if resp.status_code == 401:
            return {"error": "AUTH_FAILED", "status_code": 401}
        if resp.status_code == 429:
            return {"error": "RATE_LIMITED", "status_code": 429}
        resp.raise_for_status()
        return {"signin_logs": resp.json().get("value", []), "count": limit}
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("graph_get_signin_logs failed: %s", e)
        return {"error": "GRAPH_FAILED"}


def graph_revoke_session(user_id: str, org_id: str) -> dict:
    """Revoke all active sessions for a user. blast_radius: user."""
    try:
        resp = requests.post(
            f"{GRAPH_BASE}/users/{user_id}/revokeSignInSessions",
            headers=_headers(org_id),
            timeout=TIMEOUT,
        )
        if resp.status_code in (200, 204):
            return {"status": "revoked", "user_id": user_id}
        return {"error": "REVOKE_FAILED", "status_code": resp.status_code}
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("graph_revoke_session failed: %s", e)
        return {"error": "GRAPH_FAILED"}


def graph_disable_account(user_id: str, org_id: str) -> dict:
    """Disable a user account (accountEnabled=false). blast_radius: user."""
    try:
        resp = requests.patch(
            f"{GRAPH_BASE}/users/{user_id}",
            headers=_headers(org_id),
            json={"accountEnabled": False},
            timeout=TIMEOUT,
        )
        if resp.status_code in (200, 204):
            return {"status": "disabled", "user_id": user_id}
        return {"error": "DISABLE_FAILED", "status_code": resp.status_code}
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("graph_disable_account failed: %s", e)
        return {"error": "GRAPH_FAILED"}


def graph_reset_mfa(user_id: str, org_id: str) -> dict:
    """Require MFA re-registration for a user. blast_radius: user."""
    try:
        resp = requests.delete(
            f"{GRAPH_BASE}/users/{user_id}/authentication/microsoftAuthenticatorMethods",
            headers=_headers(org_id),
            timeout=TIMEOUT,
        )
        return {
            "status": "mfa_reset_queued",
            "user_id": user_id,
            "status_code": resp.status_code,
        }
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("graph_reset_mfa failed: %s", e)
        return {"error": "GRAPH_FAILED"}


def graph_get_device_compliance(user_id: str, org_id: str) -> dict:
    """Get device compliance state for a user's enrolled devices."""
    try:
        resp = requests.get(
            f"{GRAPH_BASE}/users/{user_id}/managedDevices",
            headers=_headers(org_id),
            timeout=TIMEOUT,
        )
        if resp.status_code == 401:
            return {"error": "AUTH_FAILED", "status_code": 401}
        resp.raise_for_status()
        devices = resp.json().get("value", [])
        return {
            "devices": [
                {
                    "id": d.get("id"),
                    "deviceName": d.get("deviceName"),
                    "complianceState": d.get("complianceState"),
                    "osVersion": d.get("osVersion"),
                }
                for d in devices
            ]
        }
    except PermissionError as e:
        return {"error": "NO_INTEGRATION", "detail": str(e)}
    except Exception as e:
        log.error("graph_get_device_compliance failed: %s", e)
        return {"error": "GRAPH_FAILED"}
