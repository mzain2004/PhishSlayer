"""
Generates professional SOC reports at 3 levels:
1. Executive Summary (CISO-readable, 1 page)
2. Technical Deep Dive (analyst-readable, full detail)
3. Compliance Report (SOC 2 / ISO 27001 / NIST mapping)
All reports use ModelRouter BALANCED tier (Sonnet).
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta

from core.harness.anthropic_client import anthropic_client

log = logging.getLogger(__name__)

_EXEC_SYSTEM = """You are a senior security advisor writing for a CISO audience.
Generate a concise 1-page executive security summary. Be professional, action-oriented.
Return plain text with clear sections: Threat Overview, Key Metrics, MTTR Trend, Recommendations."""

_TECH_SYSTEM = """You are a SOC analyst writing a detailed incident report.
Include: full timeline, IOC list, MITRE ATT&CK mapping, agent reasoning, recommended remediations.
Return structured markdown."""

_COMPLIANCE_SYSTEM = """You are a compliance specialist. Map the security activities and incidents
to the specified compliance framework controls. Return structured JSON with control mappings."""


class SOCReportGenerator:
    async def fetch_metrics(self, org_id: str, period_days: int = 30) -> dict:
        """Fetch alert metrics for the reporting period from Supabase."""
        try:
            from supabase import create_client
            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            )
            since = (datetime.utcnow() - timedelta(days=period_days)).isoformat()
            alerts = (
                sb.table("alerts")
                .select("id, severity, status, created_at, resolved_at")
                .eq("organization_id", org_id)
                .gte("created_at", since)
                .execute()
            )
            rows = alerts.data or []
            total = len(rows)
            by_severity = {}
            mttr_samples = []
            for r in rows:
                sev = r.get("severity", "unknown")
                by_severity[sev] = by_severity.get(sev, 0) + 1
                if r.get("resolved_at") and r.get("created_at"):
                    try:
                        created = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
                        resolved = datetime.fromisoformat(r["resolved_at"].replace("Z", "+00:00"))
                        mttr_samples.append((resolved - created).total_seconds() / 60)
                    except Exception:
                        pass
            avg_mttr = sum(mttr_samples) / len(mttr_samples) if mttr_samples else 0
            return {
                "period_days": period_days,
                "total_alerts": total,
                "by_severity": by_severity,
                "avg_mttr_minutes": round(avg_mttr, 1),
                "resolved": sum(1 for r in rows if r.get("status") == "resolved"),
            }
        except Exception as exc:
            log.warning("fetch_metrics failed: %s", exc)
            return {"period_days": period_days, "error": str(exc)}

    async def generate_executive_report(self, org_id: str, period_days: int = 30) -> str:
        metrics = await self.fetch_metrics(org_id, period_days)
        user_msg = (
            f"Organization: {org_id}\n"
            f"Period: last {period_days} days\n"
            f"Metrics: {json.dumps(metrics, default=str)}"
        )
        try:
            return anthropic_client.complete(
                agent_name="rule_forge",
                system_prompt=_EXEC_SYSTEM,
                user_message=user_msg,
            )
        except Exception as exc:
            log.error("executive_report_failed: %s", exc)
            return f"Report generation failed: {exc}"

    async def generate_technical_report(self, org_id: str, alert_id: str) -> str:
        """Full incident timeline, IOCs, MITRE mapping, agent reasoning."""
        try:
            from supabase import create_client
            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            )
            alert = (
                sb.table("alerts")
                .select("*")
                .eq("id", alert_id)
                .eq("organization_id", org_id)
                .maybe_single()
                .execute()
            )
            context = json.dumps(alert.data or {}, default=str)
        except Exception:
            context = f"alert_id={alert_id}"

        try:
            return anthropic_client.complete(
                agent_name="rule_forge",
                system_prompt=_TECH_SYSTEM,
                user_message=f"Incident data:\n{context}",
            )
        except Exception as exc:
            log.error("technical_report_failed: %s", exc)
            return f"Report generation failed: {exc}"

    async def generate_compliance_report(self, org_id: str, framework: str = "nist") -> str:
        """Map activities to NIST 800-53 / ISO 27001 / SOC 2 controls."""
        metrics = await self.fetch_metrics(org_id, 90)
        user_msg = (
            f"Framework: {framework.upper()}\n"
            f"Organization: {org_id}\n"
            f"90-day metrics: {json.dumps(metrics, default=str)}"
        )
        try:
            return anthropic_client.complete(
                agent_name="rule_forge",
                system_prompt=_COMPLIANCE_SYSTEM,
                user_message=user_msg,
                response_format="json",
            )
        except Exception as exc:
            log.error("compliance_report_failed: %s", exc)
            return json.dumps({"error": str(exc)})


soc_report_generator = SOCReportGenerator()
