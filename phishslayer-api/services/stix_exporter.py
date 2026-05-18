"""
stix_exporter.py — STIX 2.1 export from L3 HuntResult.
Converts hunt findings to a structured threat intelligence bundle.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import stix2
    _STIX2 = True
except ImportError:
    _STIX2 = False
    logger.warning("stix2 not installed — STIX export disabled")


class STIXExporter:
    """
    Converts L3 HuntResult dict to a STIX 2.1 Bundle.
    Produces: Indicators, AttackPatterns, Malware, ThreatActor, CourseOfAction,
              Relationships, and a Report wrapping all objects.
    Never raises — returns None on any failure or missing stix2.
    """

    def export_hunt_result(self, hunt_result: dict) -> Optional[dict]:
        """Main entry. Returns STIX 2.1 Bundle as dict, or None."""
        if not _STIX2:
            return None
        try:
            return self._build_bundle(hunt_result)
        except Exception as e:
            logger.error("stix_export_failed: %s", e)
            return None

    def _build_bundle(self, hunt_result: dict) -> dict:
        now = datetime.now(timezone.utc)
        stix_objects: list = []
        object_refs: list[str] = []

        alert_id = hunt_result.get("alert_id", "unknown")
        threat_intel = hunt_result.get("threat_intel", {})
        osint = hunt_result.get("osint", {})
        final_verdict = hunt_result.get("final_verdict", "unknown")
        incident_summary = hunt_result.get("incident_summary", "")

        mitre_techniques: list[str] = threat_intel.get("mitre_techniques", [])
        known_apt_groups: list[str] = threat_intel.get("known_apt_groups", [])
        related_iocs: list[str] = osint.get("related_iocs", [])
        ip_reputation: dict = osint.get("ip_reputation", {})

        # ── AttackPatterns from MITRE techniques ──────────────────────────────
        attack_patterns: list = []
        for technique in mitre_techniques[:10]:
            tid = technique.strip()
            if not tid:
                continue
            ap = stix2.AttackPattern(
                name=f"MITRE ATT&CK {tid}",
                external_references=[
                    stix2.ExternalReference(
                        source_name="mitre-attack",
                        external_id=tid,
                    )
                ],
            )
            stix_objects.append(ap)
            object_refs.append(ap.id)
            attack_patterns.append(ap)

        # ── ThreatActor objects for known APT groups ───────────────────────────
        threat_actors: list = []
        for group_name in known_apt_groups[:5]:
            if not group_name or group_name.lower() in ("", "unknown"):
                continue
            ta = stix2.ThreatActor(
                name=group_name,
                threat_actor_types=["unknown"],
            )
            stix_objects.append(ta)
            object_refs.append(ta.id)
            threat_actors.append(ta)

            for ap in attack_patterns:
                rel = stix2.Relationship(
                    relationship_type="uses",
                    source_ref=ta.id,
                    target_ref=ap.id,
                )
                stix_objects.append(rel)
                object_refs.append(rel.id)

        # ── Indicators from IOCs ───────────────────────────────────────────────
        for ioc_val in related_iocs[:20]:
            if not ioc_val:
                continue
            pattern, name = self._ioc_to_pattern(ioc_val)
            if not pattern:
                continue
            indicator = stix2.Indicator(
                name=name,
                pattern=pattern,
                pattern_type="stix",
                valid_from=now,
                labels=["malicious-activity"],
            )
            stix_objects.append(indicator)
            object_refs.append(indicator.id)
            for ta in threat_actors:
                rel = stix2.Relationship(
                    relationship_type="indicates",
                    source_ref=indicator.id,
                    target_ref=ta.id,
                )
                stix_objects.append(rel)
                object_refs.append(rel.id)

        # ── Malware from urlhaus tags ─────────────────────────────────────────
        urlhaus_tags: list[str] = osint.get("urlhaus_tags", [])
        if urlhaus_tags:
            mal_name = urlhaus_tags[0]
            mal = stix2.Malware(
                name=mal_name,
                malware_types=["unknown"],
                is_family=False,
            )
            stix_objects.append(mal)
            object_refs.append(mal.id)
            for ta in threat_actors:
                rel = stix2.Relationship(
                    relationship_type="uses",
                    source_ref=ta.id,
                    target_ref=mal.id,
                )
                stix_objects.append(rel)
                object_refs.append(rel.id)

        # ── CourseOfAction for each recommended action ─────────────────────────
        # Guarantees object_refs is never empty
        for action in hunt_result.get("recommended_actions", [])[:5]:
            if not action:
                continue
            coa = stix2.CourseOfAction(name=action)
            stix_objects.append(coa)
            object_refs.append(coa.id)

        # ── Patch recommendations ─────────────────────────────────────────────
        for patch in hunt_result.get("patch_recommendations", [])[:5]:
            if not patch:
                continue
            coa = stix2.CourseOfAction(name=f"Patch: {patch}")
            stix_objects.append(coa)
            object_refs.append(coa.id)

        # ── Fallback if nothing produced ──────────────────────────────────────
        if not object_refs:
            coa = stix2.CourseOfAction(name="Manual review required")
            stix_objects.append(coa)
            object_refs.append(coa.id)

        # ── Report ─────────────────────────────────────────────────────────────
        report = stix2.Report(
            name=f"PhishSlayer Incident Report: {alert_id}",
            published=now,
            object_refs=object_refs,
            description=f"Verdict: {final_verdict}. {incident_summary}",
        )

        bundle = stix2.Bundle(*stix_objects, report)
        return json.loads(bundle.serialize())

    def _ioc_to_pattern(self, ioc_val: str) -> tuple[Optional[str], str]:
        """Return (stix_pattern, label) for an IOC string, or (None, '') if unrecognisable."""
        import ipaddress
        v = ioc_val.replace("'", "\\'")
        try:
            addr = ipaddress.ip_address(ioc_val)
            if addr.version == 6:
                return f"[ipv6-addr:value = '{v}']", f"Malicious IPv6: {ioc_val}"
            return f"[ipv4-addr:value = '{v}']", f"Malicious IP: {ioc_val}"
        except ValueError:
            pass
        if ioc_val.startswith(("http://", "https://")):
            return f"[url:value = '{v}']", f"Malicious URL: {ioc_val}"
        if "." in ioc_val and len(ioc_val) <= 253:
            return f"[domain-name:value = '{v}']", f"Malicious Domain: {ioc_val}"
        return None, ""
