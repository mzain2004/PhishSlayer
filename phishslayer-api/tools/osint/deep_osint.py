"""
Deep OSINT — human-level intelligence gathering.
Combines multiple sources into a unified entity profile.
All lookups run in parallel via asyncio.gather with return_exceptions=True.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

log = logging.getLogger(__name__)


class DeepOSINT:
    # -----------------------------------------------------------------------
    # IP investigation
    # -----------------------------------------------------------------------

    async def investigate_ip(self, ip: str) -> dict:
        results = await asyncio.gather(
            self._run_sync(self._virustotal_lookup, ip),
            self._run_sync(self._abuseipdb_lookup, ip),
            self._run_sync(self._shodan_lookup, ip),
            self._run_sync(self._greynoise_lookup, ip),
            self._run_sync(self._whois_lookup, ip),
            self._passive_dns(ip),
            return_exceptions=True,
        )
        keys = ["virustotal", "abuseipdb", "shodan", "greynoise", "whois", "passive_dns"]
        return self._merge_results(keys, results)

    # -----------------------------------------------------------------------
    # Domain investigation
    # -----------------------------------------------------------------------

    async def investigate_domain(self, domain: str) -> dict:
        results = await asyncio.gather(
            self._run_sync(self._virustotal_domain, domain),
            self._run_sync(self._urlscan_search, domain),
            self._scrapling_crawl(domain),
            self._run_sync(self._whois_lookup, domain),
            self._certificate_transparency(domain),
            self._run_sync(self._haveibeenpwned_domain, domain),
            return_exceptions=True,
        )
        keys = ["virustotal", "urlscan", "scrapling", "whois", "crt_sh", "hibp"]
        return self._merge_results(keys, results)

    # -----------------------------------------------------------------------
    # Email investigation
    # -----------------------------------------------------------------------

    async def investigate_email(self, email: str) -> dict:
        results = await asyncio.gather(
            self._run_sync(self._haveibeenpwned_email, email),
            self._run_sync(self._hunter_io_verify, email),
            return_exceptions=True,
        )
        keys = ["hibp", "hunter_io"]
        return self._merge_results(keys, results)

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    async def _run_sync(self, fn, *args) -> Any:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, fn, *args)

    def _merge_results(self, keys: list[str], results: list[Any]) -> dict:
        merged: dict = {}
        for key, result in zip(keys, results):
            if isinstance(result, Exception):
                merged[key] = {"status": "error", "error": str(result)}
            else:
                merged[key] = result
        return merged

    # -----------------------------------------------------------------------
    # Sync tool wrappers
    # -----------------------------------------------------------------------

    def _virustotal_lookup(self, ip: str) -> dict:
        try:
            from tools.osint.virustotal_tool import vt_check_ip
            return vt_check_ip(ip)
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _virustotal_domain(self, domain: str) -> dict:
        try:
            from tools.osint.virustotal_tool import vt_check_domain
            return vt_check_domain(domain)
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _abuseipdb_lookup(self, ip: str) -> dict:
        try:
            from tools.osint.abuseipdb_tool import abuseipdb_check
            return abuseipdb_check(ip)
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _urlscan_search(self, domain: str) -> dict:
        try:
            from tools.osint.urlscan_tool import urlscan_submit
            return urlscan_submit(f"https://{domain}")
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _shodan_lookup(self, ip: str) -> dict:
        """Shodan community API (free tier)."""
        try:
            import requests
            key = os.getenv("SHODAN_API_KEY", "")
            if not key:
                return {"status": "skipped", "reason": "SHODAN_API_KEY not set"}
            resp = requests.get(
                f"https://api.shodan.io/shodan/host/{ip}",
                params={"key": key},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "org": data.get("org"),
                    "country": data.get("country_name"),
                    "ports": data.get("ports", []),
                    "vulns": list(data.get("vulns", {}).keys())[:10],
                    "tags": data.get("tags", []),
                }
            return {"status": "not_found", "code": resp.status_code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _greynoise_lookup(self, ip: str) -> dict:
        """GreyNoise community API (free)."""
        try:
            import requests
            resp = requests.get(
                f"https://api.greynoise.io/v3/community/{ip}",
                headers={"key": os.getenv("GREYNOISE_API_KEY", "")},
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json()
            return {"status": "not_found", "code": resp.status_code}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _whois_lookup(self, target: str) -> dict:
        """WHOIS via scrapling fetch of whois.com."""
        try:
            from tools.osint.scrapling_tool import scrapling_fetch
            result = scrapling_fetch(f"https://www.whois.com/whois/{target}")
            return {"raw": str(result)[:2000]}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def _passive_dns(self, ip: str) -> dict:
        """Passive DNS via VirusTotal resolutions."""
        try:
            import requests
            key = os.getenv("VIRUSTOTAL_API_KEY", "")
            if not key:
                return {"status": "skipped"}
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(
                None,
                lambda: requests.get(
                    f"https://www.virustotal.com/api/v3/ip_addresses/{ip}/resolutions",
                    headers={"x-apikey": key},
                    timeout=10,
                ),
            )
            if resp.status_code == 200:
                data = resp.json()
                resolutions = [
                    r["attributes"].get("host_name")
                    for r in data.get("data", [])[:20]
                ]
                return {"resolutions": resolutions}
            return {"status": "not_found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def _scrapling_crawl(self, domain: str) -> dict:
        try:
            from tools.osint.scrapling_tool import scrapling_fetch
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: scrapling_fetch(f"https://{domain}")
            )
            return {"content": str(result)[:3000]}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def _certificate_transparency(self, domain: str) -> dict:
        """crt.sh — free certificate transparency logs."""
        try:
            import requests
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(
                None,
                lambda: requests.get(
                    "https://crt.sh/",
                    params={"q": f"%.{domain}", "output": "json"},
                    timeout=15,
                ),
            )
            if resp.status_code == 200:
                certs = resp.json()[:20]
                return {
                    "count": len(certs),
                    "subdomains": list({c.get("name_value", "") for c in certs})[:30],
                }
            return {"status": "not_found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _haveibeenpwned_domain(self, domain: str) -> dict:
        try:
            import requests
            key = os.getenv("HIBP_API_KEY", "")
            if not key:
                return {"status": "skipped", "reason": "HIBP_API_KEY not set"}
            resp = requests.get(
                f"https://haveibeenpwned.com/api/v3/breacheddomain/{domain}",
                headers={"hibp-api-key": key},
                timeout=10,
            )
            if resp.status_code == 200:
                return {"breaches": resp.json()}
            return {"status": "not_found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _haveibeenpwned_email(self, email: str) -> dict:
        try:
            import requests
            key = os.getenv("HIBP_API_KEY", "")
            if not key:
                return {"status": "skipped", "reason": "HIBP_API_KEY not set"}
            resp = requests.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
                headers={"hibp-api-key": key},
                timeout=10,
            )
            if resp.status_code == 200:
                return {"breaches": resp.json()}
            return {"status": "not_found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _hunter_io_verify(self, email: str) -> dict:
        try:
            import requests
            key = os.getenv("HUNTER_IO_API_KEY", "")
            if not key:
                return {"status": "skipped", "reason": "HUNTER_IO_API_KEY not set"}
            resp = requests.get(
                "https://api.hunter.io/v2/email-verifier",
                params={"email": email, "api_key": key},
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json().get("data", {})
            return {"status": "not_found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}


deep_osint = DeepOSINT()
