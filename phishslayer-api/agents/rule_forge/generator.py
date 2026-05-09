"""
Rule Forge: auto-generates detection rules from L3 hunt findings.
Generates: Sigma rules + YARA rules + Wazuh XML decoders.
Uses ModelTier.BALANCED (Sonnet) for rule generation.
All rules stored with status='pending' — human review required before deployment.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from core.harness.anthropic_client import anthropic_client

log = logging.getLogger(__name__)

_SIGMA_SYSTEM = """You are a detection engineer. Generate a Sigma detection rule (YAML) from the hunt report provided.
Follow Sigma specification v2.0 exactly. Output ONLY the YAML Sigma rule, no explanations."""

_YARA_SYSTEM = """You are a malware analyst. Generate a YARA rule for file-based detection from the hunt report.
Output ONLY the YARA rule, no explanations."""

_WAZUH_SYSTEM = """You are a Wazuh expert. Generate a Wazuh XML detection rule/decoder from the hunt report.
Output ONLY the XML rule, no explanations. Follow Wazuh rule syntax exactly."""


class RuleForgeAgent:
    async def generate_sigma_rule(self, hunt_report: dict) -> str:
        """Generate Sigma rule from hunt findings."""
        prompt = json.dumps({
            "attack_type": hunt_report.get("attack_type", ""),
            "iocs": hunt_report.get("ioc_table", [])[:10],
            "mitre_techniques": hunt_report.get("mitre_techniques", []),
            "indicators": hunt_report.get("attack_chain", []),
            "executive_summary": hunt_report.get("executive_summary", "")[:500],
        }, default=str)
        try:
            return anthropic_client.complete(
                agent_name="rule_forge",
                system_prompt=_SIGMA_SYSTEM,
                user_message=f"Hunt report:\n{prompt}",
            )
        except Exception as exc:
            log.error("sigma_generation_failed: %s", exc)
            return ""

    async def generate_yara_rule(self, hunt_report: dict) -> str:
        """Generate YARA rule for file-based detection."""
        prompt = json.dumps({
            "attack_type": hunt_report.get("attack_type", ""),
            "iocs": [i for i in hunt_report.get("ioc_table", []) if i.get("type") in ("hash", "filename", "path")][:10],
            "mitre_techniques": hunt_report.get("mitre_techniques", []),
        }, default=str)
        try:
            return anthropic_client.complete(
                agent_name="rule_forge",
                system_prompt=_YARA_SYSTEM,
                user_message=f"Hunt report:\n{prompt}",
            )
        except Exception as exc:
            log.error("yara_generation_failed: %s", exc)
            return ""

    async def generate_wazuh_rule(self, hunt_report: dict) -> str:
        """Generate Wazuh XML rule/decoder."""
        prompt = json.dumps({
            "attack_type": hunt_report.get("attack_type", ""),
            "iocs": hunt_report.get("ioc_table", [])[:10],
            "mitre_techniques": hunt_report.get("mitre_techniques", []),
            "recommendations": hunt_report.get("recommendations", []),
        }, default=str)
        try:
            return anthropic_client.complete(
                agent_name="rule_forge",
                system_prompt=_WAZUH_SYSTEM,
                user_message=f"Hunt report:\n{prompt}",
            )
        except Exception as exc:
            log.error("wazuh_rule_generation_failed: %s", exc)
            return ""

    async def push_to_wazuh(self, org_id: str, rule_xml: str) -> dict:
        """Push generated rule to Wazuh manager via API (only if integration configured)."""
        try:
            from tools.edr.wazuh_tool import wazuh_add_rule
            return wazuh_add_rule(rule_xml, org_id)
        except Exception as exc:
            log.error("wazuh_push_failed for org %s: %s", org_id, exc)
            return {"status": "error", "error": str(exc)}

    async def generate_all_rules(self, hunt_report: dict, org_id: str, hunt_report_id: str) -> dict:
        """Generate Sigma + YARA + Wazuh rules. Store all as pending."""
        import asyncio
        sigma, yara, wazuh = await asyncio.gather(
            self.generate_sigma_rule(hunt_report),
            self.generate_yara_rule(hunt_report),
            self.generate_wazuh_rule(hunt_report),
        )
        return {
            "sigma": sigma,
            "yara": yara,
            "wazuh": wazuh,
            "hunt_report_id": hunt_report_id,
            "org_id": org_id,
            "status": "pending",
        }


rule_forge = RuleForgeAgent()
