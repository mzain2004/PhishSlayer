"""
MISP (Malware Information Sharing Platform) integration.
Enriches IOCs with community threat intelligence.
Uses PyMISP SDK: pip install pymisp>=2.4.180
"""
from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)


class MISPConnector:
    def __init__(self, url: str, key: str, ssl: bool = True):
        self._url = url
        self._key = key
        self._ssl = ssl
        self._misp = None

    def _get_client(self):
        if self._misp is None:
            from pymisp import PyMISP  # type: ignore[import]
            self._misp = PyMISP(self._url, self._key, self._ssl)
        return self._misp

    def search_ioc(self, ioc_value: str, ioc_type: str = "ip-src") -> list[dict]:
        """Search MISP for matching IOCs."""
        try:
            misp = self._get_client()
            result = misp.search(
                controller="attributes",
                value=ioc_value,
                type_attribute=ioc_type,
                limit=10,
                pythonify=True,
            )
            return [
                {
                    "event_id": attr.event_id,
                    "category": attr.category,
                    "type": attr.type,
                    "value": attr.value,
                    "comment": attr.comment,
                    "threat_level": getattr(attr, "threat_level_id", None),
                    "tags": [t.name for t in getattr(attr, "Tag", [])],
                }
                for attr in result
            ]
        except Exception as exc:
            log.warning("MISP search_ioc failed for %s: %s", ioc_value, exc)
            return []

    def get_event(self, event_id: int) -> dict:
        """Get full MISP event with all attributes."""
        try:
            misp = self._get_client()
            event = misp.get_event(event_id, pythonify=True)
            return {
                "id": event.id,
                "info": event.info,
                "threat_level": event.threat_level_id,
                "analysis": event.analysis,
                "date": str(event.date),
                "attribute_count": len(event.attributes),
                "tags": [t.name for t in event.tags] if event.tags else [],
            }
        except Exception as exc:
            log.warning("MISP get_event failed for event %s: %s", event_id, exc)
            return {}

    def submit_ioc(self, event_id: int, ioc_type: str, ioc_value: str, comment: str = "") -> bool:
        """Submit new IOC back to MISP community."""
        try:
            misp = self._get_client()
            misp.add_attribute(
                event_id,
                {
                    "type": ioc_type,
                    "value": ioc_value,
                    "comment": f"[PhishSlayer] {comment}",
                    "to_ids": True,
                },
            )
            return True
        except Exception as exc:
            log.warning("MISP submit_ioc failed: %s", exc)
            return False


def get_misp_connector(org_config: dict) -> MISPConnector | None:
    """Build MISPConnector from org integration config. Returns None if not configured."""
    url = org_config.get("misp_url")
    key = org_config.get("misp_api_key")
    if not url or not key:
        return None
    ssl = org_config.get("misp_ssl", True)
    return MISPConnector(url=url, key=key, ssl=ssl)
