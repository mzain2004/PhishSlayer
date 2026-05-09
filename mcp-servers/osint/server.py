"""
PhishSlayer OSINT MCP Server
Exposes OSINT tools as MCP tools accessible by any Claude agent.
Run: python server.py (port 9001)
"""
import sys
import os

# Allow imports from phishslayer-api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../phishslayer-api"))

from mcp.server.fastmcp import FastMCP  # type: ignore[import]

mcp = FastMCP("phishslayer-osint", port=9001)


@mcp.tool()
def vt_check_ip(ip: str) -> dict:
    """Check IP against VirusTotal threat intelligence."""
    from tools.osint.virustotal_tool import vt_check_ip as _vt
    return _vt(ip)


@mcp.tool()
def vt_check_domain(domain: str) -> dict:
    """Check domain against VirusTotal threat intelligence."""
    try:
        from tools.osint.virustotal_tool import vt_check_domain as _vt
        return _vt(domain)
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def abuseipdb_check(ip: str) -> dict:
    """Check IP reputation via AbuseIPDB."""
    from tools.osint.abuseipdb_tool import abuseipdb_check as _abuse
    return _abuse(ip)


@mcp.tool()
def urlscan_submit(url: str) -> dict:
    """Submit URL to urlscan.io and get analysis results."""
    from tools.osint.urlscan_tool import urlscan_submit as _scan
    return _scan(url)


@mcp.tool()
def scrapling_fetch(url: str, stealth: bool = False) -> dict:
    """Fetch and extract text from URL using Scrapling web scraper."""
    from tools.osint.scrapling_tool import scrapling_fetch as _fetch
    return _fetch(url)


@mcp.tool()
def shodan_lookup(ip: str) -> dict:
    """Look up IP in Shodan for open ports, vulnerabilities, and org info."""
    from tools.osint.deep_osint import deep_osint
    import asyncio
    return asyncio.run(deep_osint._run_sync(deep_osint._shodan_lookup, ip))


@mcp.tool()
def whois_lookup(target: str) -> dict:
    """Perform WHOIS lookup on an IP or domain."""
    from tools.osint.deep_osint import deep_osint
    import asyncio
    return asyncio.run(deep_osint._run_sync(deep_osint._whois_lookup, target))


@mcp.tool()
def misp_search(ioc_value: str, ioc_type: str = "ip-src", org_id: str = "") -> dict:
    """Search MISP community threat intelligence for an IOC."""
    try:
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
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def deep_osint_investigate(target: str, target_type: str = "ip") -> dict:
    """
    Full deep OSINT investigation for an IP, domain, or email.
    target_type: 'ip' | 'domain' | 'email'
    """
    import asyncio
    from tools.osint.deep_osint import deep_osint
    if target_type == "ip":
        return asyncio.run(deep_osint.investigate_ip(target))
    elif target_type == "domain":
        return asyncio.run(deep_osint.investigate_domain(target))
    elif target_type == "email":
        return asyncio.run(deep_osint.investigate_email(target))
    return {"status": "error", "error": f"Unknown target_type: {target_type}"}


if __name__ == "__main__":
    mcp.run()
