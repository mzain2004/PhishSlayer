"""
l3_hunter/deerflow/researcher.py — DeerFlow ResearchTeamNode adapter + fallback.

Used both as a DeerFlow ResearchTeamNode subclass (when SDK available) and as a
standalone fallback researcher that calls Scrapling + Page Index RAG + VirusTotal.

SDK_REQUIRED: deerflow.ResearchTeamNode
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Optional

log = logging.getLogger(__name__)


class FallbackResearcher:
    """
    Standalone researcher used when DeerFlow SDK is not installed.
    Calls Scrapling OSINT fetch + Page Index RAG in parallel.
    """

    def __init__(self, org_id: str):
        self.org_id = org_id

    async def research(
        self,
        alert_id: str,
        hunt_objective: str,
        l2_result: dict,
        raw_iocs: list[dict],
    ) -> dict:
        source_ip = l2_result.get("source_ip", "")
        affected_asset = l2_result.get("affected_asset", "")

        results: dict = {
            "scrapling": [],
            "rag_context": [],
            "vt_results": [],
            "iocs_found": raw_iocs,
        }

        tasks = []
        if source_ip:
            tasks.append(self._osint_lookup(source_ip))
        tasks.append(self._rag_query(hunt_objective))
        if source_ip:
            tasks.append(self._vt_lookup(source_ip))

        gathered = await asyncio.gather(*tasks, return_exceptions=True)

        for i, res in enumerate(gathered):
            if isinstance(res, Exception):
                log.warning("Research task %d failed: %s", i, res)
            elif isinstance(res, dict):
                key = res.get("_type", "unknown")
                if key == "osint":
                    results["scrapling"].append(res)
                elif key == "rag":
                    results["rag_context"] = res.get("chunks", [])
                elif key == "vt":
                    results["vt_results"].append(res)

        return results

    async def _osint_lookup(self, ip: str) -> dict:
        try:
            from tools.osint.scrapling_tool import scrapling_fetch
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(
                None,
                lambda: scrapling_fetch(f"https://www.abuseipdb.com/check/{ip}", stealth=False),
            )
            return {"_type": "osint", "ip": ip, "content": resp.content if hasattr(resp, "content") else {}}
        except Exception as e:
            log.warning("OSINT lookup failed for %s: %s", ip, e)
            return {"_type": "osint", "ip": ip, "error": "LOOKUP_FAILED"}

    async def _rag_query(self, query: str) -> dict:
        try:
            from memory.rag.hybrid_rag import HybridRAGAdapter
            adapter = HybridRAGAdapter()
            chunks = adapter.query(query, top_k=5)
            return {"_type": "rag", "chunks": chunks}
        except Exception as e:
            log.warning("RAG query failed: %s", e)
            return {"_type": "rag", "chunks": []}

    async def _vt_lookup(self, ip: str) -> dict:
        try:
            from tools.osint.virustotal_tool import vt_check_ip
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(None, vt_check_ip, ip)
            return {"_type": "vt", "ip": ip, "result": resp}
        except Exception as e:
            log.warning("VirusTotal lookup failed for %s: %s", ip, e)
            return {"_type": "vt", "ip": ip, "error": "VT_FAILED"}


try:
    from deerflow import ResearchTeamNode  # type: ignore[import]

    class L3ResearchTeamNode(ResearchTeamNode):
        """
        DeerFlow ResearchTeamNode subclass using Scrapling + Page Index RAG + VT.
        Registered with DeerFlow Coordinator as the search provider.
        """

        def __init__(self, org_id: str, **kwargs: Any):
            super().__init__(**kwargs)
            self._fallback = FallbackResearcher(org_id)
            self.org_id = org_id

        async def search(self, query: str, **kwargs: Any) -> list[dict]:
            results = await self._fallback._rag_query(query)
            return results.get("chunks", [])

        async def fetch_url(self, url: str, **kwargs: Any) -> str:
            try:
                from tools.osint.scrapling_tool import scrapling_fetch
                loop = asyncio.get_event_loop()
                resp = await loop.run_in_executor(None, scrapling_fetch, url, False)
                if hasattr(resp, "content") and isinstance(resp.content, dict):
                    return resp.content.get("content", "")
                return ""
            except Exception as e:
                log.warning("L3ResearchTeamNode fetch_url failed: %s", e)
                return ""

except ImportError:
    pass
