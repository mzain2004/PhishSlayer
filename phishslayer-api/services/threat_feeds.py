import asyncio
import aiohttp
import os
import logging
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class IOCEnrichment:
    """Structured enrichment result passed to L1 agent context."""
    ioc_value: str
    ioc_type: str  # ip/domain/url/hash_md5/hash_sha256

    # AbuseIPDB fields (IP only)
    abuseipdb_confidence: int = 0
    abuseipdb_total_reports: int = 0
    abuseipdb_country: str = ""
    abuseipdb_usage_type: str = ""
    abuseipdb_is_tor: bool = False

    # ThreatFox fields (all IOC types)
    threatfox_found: bool = False
    threatfox_malware: str = ""
    threatfox_confidence: int = 0
    threatfox_first_seen: str = ""

    # URLHaus fields (domain/url only)
    urlhaus_status: str = ""
    urlhaus_tags: list = field(default_factory=list)
    urlhaus_url_count: int = 0

    # MalwareBazaar fields (hash only)
    malwarebazaar_found: bool = False
    malwarebazaar_signature: str = ""
    malwarebazaar_file_type: str = ""
    malwarebazaar_tags: list = field(default_factory=list)

    @property
    def overall_threat_score(self) -> int:
        """0-100 composite threat score across all feeds."""
        scores = []
        if self.abuseipdb_confidence > 0:
            scores.append(self.abuseipdb_confidence)
        if self.threatfox_found:
            scores.append(min(self.threatfox_confidence * 10, 100))
        if self.urlhaus_status == "online":
            scores.append(85)
        elif self.urlhaus_status == "offline":
            scores.append(40)
        if self.malwarebazaar_found:
            scores.append(95)
        if self.abuseipdb_is_tor:
            scores.append(60)
        return int(sum(scores) / len(scores)) if scores else 0

    @property
    def threat_summary_for_llm(self) -> str:
        """Human-readable summary injected into L1/L2 agent prompts. Under 200 chars."""
        parts = []
        if self.abuseipdb_confidence >= 25:
            parts.append(f"AbuseIPDB:{self.abuseipdb_confidence}%({self.abuseipdb_total_reports} reports)")
        if self.threatfox_found:
            parts.append(f"ThreatFox:MALWARE={self.threatfox_malware}")
        if self.urlhaus_status == "online":
            parts.append("URLHaus:ACTIVE_MALWARE_DISTRIBUTION")
        if self.malwarebazaar_found:
            parts.append(f"MalwareBazaar:{self.malwarebazaar_signature}({self.malwarebazaar_file_type})")
        if self.abuseipdb_is_tor:
            parts.append("TOR_EXIT_NODE")
        if not parts:
            return "No threat intelligence found in monitored feeds."
        return "THREAT_INTEL: " + " | ".join(parts)


class ThreatFeedEnricher:
    """
    Async IOC enrichment from free threat feeds.
    Called by L1 agent BEFORE LLM classification.
    """

    REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=3.0, connect=1.0)

    def __init__(self):
        self.abuseipdb_key = os.getenv("ABUSEIPDB_API_KEY", "")
        if not self.abuseipdb_key:
            logger.warning("ABUSEIPDB_API_KEY not set — AbuseIPDB enrichment disabled")

    async def enrich(self, ioc_value: str, ioc_type: str) -> IOCEnrichment:
        """Main entry point. Runs all applicable feeds concurrently. Never throws."""
        result = IOCEnrichment(ioc_value=ioc_value, ioc_type=ioc_type)

        tasks = []
        if ioc_type == "ip":
            tasks.append(self._enrich_abuseipdb(result, ioc_value))
            tasks.append(self._enrich_threatfox(result, ioc_value))
        elif ioc_type in ("domain", "url"):
            tasks.append(self._enrich_urlhaus(result, ioc_value))
            tasks.append(self._enrich_threatfox(result, ioc_value))
        elif ioc_type in ("hash_md5", "hash_sha256", "hash_sha1"):
            tasks.append(self._enrich_malwarebazaar(result, ioc_value))
            tasks.append(self._enrich_threatfox(result, ioc_value))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        logger.info("ioc_enrichment_complete", extra={
            "ioc": ioc_value[:50],
            "type": ioc_type,
            "score": result.overall_threat_score,
            "feeds_hit": sum([
                result.abuseipdb_confidence > 0,
                result.threatfox_found,
                result.urlhaus_status != "",
                result.malwarebazaar_found,
            ])
        })
        return result

    async def _enrich_abuseipdb(self, result: IOCEnrichment, ip: str) -> None:
        if not self.abuseipdb_key:
            return
        try:
            async with aiohttp.ClientSession(timeout=self.REQUEST_TIMEOUT) as session:
                async with session.get(
                    "https://api.abuseipdb.com/api/v2/check",
                    params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": ""},
                    headers={"Key": self.abuseipdb_key, "Accept": "application/json"}
                ) as resp:
                    if resp.status == 200:
                        data = (await resp.json()).get("data", {})
                        result.abuseipdb_confidence = data.get("abuseConfidenceScore", 0)
                        result.abuseipdb_total_reports = data.get("totalReports", 0)
                        result.abuseipdb_country = data.get("countryCode", "")
                        result.abuseipdb_usage_type = data.get("usageType", "")
                        result.abuseipdb_is_tor = data.get("isTor", False)
        except Exception as e:
            logger.debug(f"abuseipdb_error: {e}")

    async def _enrich_threatfox(self, result: IOCEnrichment, ioc: str) -> None:
        try:
            async with aiohttp.ClientSession(timeout=self.REQUEST_TIMEOUT) as session:
                async with session.post(
                    "https://threatfox-api.abuse.ch/api/v1/",
                    json={"query": "search_ioc", "search_term": ioc}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("query_status") == "ok" and data.get("data"):
                            hit = data["data"][0]
                            result.threatfox_found = True
                            result.threatfox_malware = hit.get("malware", "unknown")
                            result.threatfox_confidence = hit.get("confidence_level", 0)
                            result.threatfox_first_seen = hit.get("first_seen", "")
        except Exception as e:
            logger.debug(f"threatfox_error: {e}")

    async def _enrich_urlhaus(self, result: IOCEnrichment, host: str) -> None:
        try:
            async with aiohttp.ClientSession(timeout=self.REQUEST_TIMEOUT) as session:
                async with session.post(
                    "https://urlhaus-api.abuse.ch/v1/host/",
                    data={"host": host}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        result.urlhaus_status = data.get("query_status", "")
                        urls = data.get("urls", [])
                        result.urlhaus_url_count = len(urls)
                        if urls:
                            all_tags = []
                            for url_entry in urls[:5]:
                                all_tags.extend(url_entry.get("tags", []) or [])
                            result.urlhaus_tags = list(set(all_tags))
        except Exception as e:
            logger.debug(f"urlhaus_error: {e}")

    async def _enrich_malwarebazaar(self, result: IOCEnrichment, file_hash: str) -> None:
        try:
            async with aiohttp.ClientSession(timeout=self.REQUEST_TIMEOUT) as session:
                async with session.post(
                    "https://mb-api.abuse.ch/api/v1/",
                    data={"query": "get_info", "hash": file_hash}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("query_status") == "ok" and data.get("data"):
                            sample = data["data"][0]
                            result.malwarebazaar_found = True
                            result.malwarebazaar_signature = sample.get("signature", "unknown")
                            result.malwarebazaar_file_type = sample.get("file_type", "unknown")
                            result.malwarebazaar_tags = sample.get("tags", []) or []
        except Exception as e:
            logger.debug(f"malwarebazaar_error: {e}")

    async def enrich_alert(self, alert: dict) -> dict:
        """Extract all IOCs from a Wazuh alert and enrich them concurrently."""
        iocs_to_enrich: list[tuple[str, str]] = []

        src_ip = (
            alert.get("data", {}).get("srcip") or
            alert.get("data", {}).get("src_ip") or
            alert.get("agent", {}).get("ip")
        )
        if src_ip and self._is_valid_external_ip(src_ip):
            iocs_to_enrich.append((src_ip, "ip"))

        dst_ip = alert.get("data", {}).get("dstip") or alert.get("data", {}).get("dst_ip")
        if dst_ip and self._is_valid_external_ip(dst_ip):
            iocs_to_enrich.append((dst_ip, "ip"))

        domain = alert.get("data", {}).get("hostname") or alert.get("data", {}).get("domain")
        if domain and "." in domain and not domain.endswith(".local"):
            iocs_to_enrich.append((domain, "domain"))

        for hash_field in ["md5", "sha256", "sha1", "hash"]:
            hash_val = alert.get("data", {}).get(hash_field)
            if hash_val and len(hash_val) in (32, 40, 64):
                hash_type = {"32": "hash_md5", "40": "hash_sha1", "64": "hash_sha256"}[str(len(hash_val))]
                iocs_to_enrich.append((hash_val, hash_type))

        if not iocs_to_enrich:
            return {}

        semaphore = asyncio.Semaphore(3)

        async def bounded_enrich(ioc_val, ioc_type):
            async with semaphore:
                return ioc_val, await self.enrich(ioc_val, ioc_type)

        results = await asyncio.gather(
            *[bounded_enrich(v, t) for v, t in iocs_to_enrich],
            return_exceptions=True
        )

        enrichment_map = {}
        for r in results:
            if isinstance(r, tuple):
                ioc_val, enrichment = r
                enrichment_map[ioc_val] = enrichment

        return enrichment_map

    def _is_valid_external_ip(self, ip: str) -> bool:
        """Skip private/loopback IPs."""
        import ipaddress
        try:
            addr = ipaddress.ip_address(ip)
            return not (addr.is_private or addr.is_loopback or addr.is_link_local)
        except ValueError:
            return False
