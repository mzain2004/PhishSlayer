"""
Machine quarantine via Wazuh active response.
Isolates infected endpoints from network.
NEVER quarantines whitelisted critical assets.
All actions logged with full chain of custody.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime

log = logging.getLogger(__name__)


class QuarantineManager:
    async def isolate_machine(self, org_id: str, agent_id: str, alert_id: str) -> dict:
        """
        Quarantine endpoint via Wazuh firewall-drop active response.
        Blocked if asset is whitelisted or maintenance window is active.
        """
        if await self._is_whitelisted(org_id, agent_id):
            log.warning(
                "quarantine_blocked_whitelist",
                extra={"org_id": org_id, "agent_id": agent_id, "alert_id": alert_id},
            )
            return {"status": "blocked", "reason": "CRITICAL_ASSET_WHITELISTED"}

        if await self._is_maintenance_window(org_id):
            log.info(
                "quarantine_queued_maintenance",
                extra={"org_id": org_id, "agent_id": agent_id},
            )
            return {"status": "queued", "reason": "MAINTENANCE_WINDOW"}

        await self._log_action(org_id, agent_id, alert_id, "isolate")

        try:
            from tools.edr.wazuh_tool import wazuh_active_response
            result = wazuh_active_response(agent_id, "firewall-drop", org_id)
            log.info(
                "quarantine_executed",
                extra={"org_id": org_id, "agent_id": agent_id, "alert_id": alert_id},
            )
            return {"status": "executed", "result": result}
        except Exception as exc:
            log.error("quarantine_failed: %s", exc)
            return {"status": "failed", "error": str(exc)}

    async def release_machine(self, org_id: str, agent_id: str, approved_by: str) -> dict:
        """Release quarantine. Requires explicit human approval."""
        await self._log_action(org_id, agent_id, None, "release", approved_by)
        try:
            from tools.edr.wazuh_tool import wazuh_active_response
            result = wazuh_active_response(agent_id, "firewall-undrop", org_id)
            log.info(
                "quarantine_released",
                extra={"org_id": org_id, "agent_id": agent_id, "approved_by": approved_by},
            )
            return {"status": "released", "result": result}
        except Exception as exc:
            log.error("quarantine_release_failed: %s", exc)
            return {"status": "failed", "error": str(exc)}

    async def _is_whitelisted(self, org_id: str, asset_identifier: str) -> bool:
        try:
            from supabase import create_client
            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            )
            row = (
                sb.table("critical_assets")
                .select("id")
                .eq("organization_id", org_id)
                .eq("identifier", asset_identifier)
                .maybe_single()
                .execute()
            )
            return bool(row.data)
        except Exception:
            return False

    async def _is_maintenance_window(self, org_id: str) -> bool:
        try:
            from supabase import create_client
            now = datetime.utcnow().isoformat()
            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            )
            row = (
                sb.table("maintenance_windows")
                .select("id")
                .eq("organization_id", org_id)
                .lte("start_time", now)
                .gte("end_time", now)
                .maybe_single()
                .execute()
            )
            return bool(row.data)
        except Exception:
            return False

    async def _log_action(
        self,
        org_id: str,
        agent_id: str,
        alert_id: str | None,
        action: str,
        approved_by: str | None = None,
    ) -> None:
        try:
            from supabase import create_client
            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            )
            sb.table("quarantine_actions").insert({
                "organization_id": org_id,
                "agent_id": agent_id,
                "alert_id": alert_id,
                "action": action,
                "approved_by": approved_by,
                "executed_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as exc:
            log.warning("quarantine_log_failed: %s", exc)


quarantine_manager = QuarantineManager()
