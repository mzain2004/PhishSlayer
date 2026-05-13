"""
PhishSlayer OSINT MCP Server
Exposes OSINT tools as MCP tools accessible by any Claude agent.
Run: python server.py (port 9001)
"""
import sys
import os
import logging
from pathlib import Path

from dotenv import load_dotenv

# Allow imports from phishslayer-api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../phishslayer-api"))
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

from mcp.server.fastmcp import FastMCP  # type: ignore[import]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("mcp_server.osint")


def _require_org_id(org_id: str) -> str:
    if not isinstance(org_id, str) or not org_id.strip():
        raise ValueError("org_id must be a non-empty string")
    return org_id.strip()


def _error_response(operation: str) -> dict:
    log.exception("%s_failed", operation)
    return {"status": "error", "error": "Internal server error"}

mcp = FastMCP("phishslayer-osint", port=9001)


@mcp.tool()
def vt_check_ip(ip: str) -> dict:
    """Check IP against VirusTotal threat intelligence."""
    try:
        from tools.osint.virustotal_tool import vt_check_ip as _vt
        return _vt(ip)
    except Exception:
        return _error_response("vt_check_ip")


@mcp.tool()
def vt_check_domain(domain: str) -> dict:
    """Check domain against VirusTotal threat intelligence."""
    try:
        from tools.osint.virustotal_tool import vt_check_domain as _vt
        return _vt(domain)
    except Exception:
        return _error_response("vt_check_domain")


@mcp.tool()
def abuseipdb_check(ip: str) -> dict:
    """Check IP reputation via AbuseIPDB."""
    try:
        from tools.osint.abuseipdb_tool import abuseipdb_check as _abuse
        return _abuse(ip)
    except Exception:
        return _error_response("abuseipdb_check")


@mcp.tool()
def urlscan_submit(url: str) -> dict:
    """Submit URL to urlscan.io and get analysis results."""
    try:
        from tools.osint.urlscan_tool import urlscan_submit as _scan
        return _scan(url)
    except Exception:
        return _error_response("urlscan_submit")


@mcp.tool()
def scrapling_fetch(url: str, stealth: bool = False) -> dict:
    """Fetch and extract text from URL using Scrapling web scraper."""
    try:
        from tools.osint.scrapling_tool import scrapling_fetch as _fetch
        return _fetch(url)
    except Exception:
        return _error_response("scrapling_fetch")


@mcp.tool()
def shodan_lookup(ip: str) -> dict:
    """Look up IP in Shodan for open ports, vulnerabilities, and org info."""
    try:
        from tools.osint.deep_osint import deep_osint
        import asyncio
        return asyncio.run(deep_osint._run_sync(deep_osint._shodan_lookup, ip))
    except Exception:
        return _error_response("shodan_lookup")


@mcp.tool()
def whois_lookup(target: str) -> dict:
    """Perform WHOIS lookup on an IP or domain."""
    try:
        from tools.osint.deep_osint import deep_osint
        import asyncio
        return asyncio.run(deep_osint._run_sync(deep_osint._whois_lookup, target))
    except Exception:
        return _error_response("whois_lookup")


@mcp.tool()
def misp_search(ioc_value: str, org_id: str, ioc_type: str = "ip-src") -> dict:
    """Search MISP community threat intelligence for an IOC."""
    try:
        org_id = _require_org_id(org_id)
        from supabase import create_client
        sb = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
        row = sb.table("integrations").select("config,credentials").eq("organization_id", org_id).eq("provider", "misp").maybe_single().execute()
        if not row.data:
            return {"status": "skipped", "reason": "MISP not configured for org"}
        cfg = {**row.data.get("config", {}), **row.data.get("credentials", {})}
        from tools.cti.misp_tool import get_misp_connector
        connector = get_misp_connector(cfg)
        if not connector:
            return {"status": "skipped", "reason": "MISP credentials incomplete"}
        return {"results": connector.search_ioc(ioc_value, ioc_type)}
    except Exception:
        return _error_response("misp_search")


@mcp.tool()
def deep_osint_investigate(target: str, target_type: str = "ip") -> dict:
    """
    Full deep OSINT investigation for an IP, domain, or email.
    target_type: 'ip' | 'domain' | 'email'
    """
    try:
        import asyncio
        from tools.osint.deep_osint import deep_osint
        if target_type == "ip":
            return asyncio.run(deep_osint.investigate_ip(target))
        if target_type == "domain":
            return asyncio.run(deep_osint.investigate_domain(target))
        if target_type == "email":
            return asyncio.run(deep_osint.investigate_email(target))
        return {"status": "error", "error": "Invalid target_type"}
    except Exception:
        return _error_response("deep_osint_investigate")


if __name__ == "__main__":
    mcp.run()
