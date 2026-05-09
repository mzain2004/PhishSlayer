"""
Scrapling-based OSINT fetch/crawl tools.
Uses Scrapling (github.com/D4Vinci/Scrapling) — NOT Firecrawl.
Returns plain dicts compatible with ToolDefinition/ToolRegistry callable pattern.

Fetcher instances are created lazily inside each function so the module loads
even when optional Scrapling backends (playwright, curl_cffi) aren't fully
installed in the current environment.
"""
import bleach
import time
from observability.logger import AgentLogger

_log = AgentLogger("l1", "", "", "")


def scrapling_fetch(url: str, stealth: bool = False) -> dict:
    """
    Fetch a single URL using Scrapling SDK.
    stealth=True uses StealthyFetcher for bot-protected pages.
    Returns clean text content (bleach-sanitized) for LLM consumption.
    """
    t0 = time.monotonic()
    try:
        from scrapling import Fetcher, StealthyFetcher

        fetcher = StealthyFetcher(auto_match=False) if stealth else Fetcher(auto_match=False)
        page = fetcher.get(
            url,
            stealthy_headers=stealth,
            timeout=10,
            max_content_size=500_000,
        )
        raw_text = page.get_all_text(ignore_tags=("script", "style", "noscript"))
        clean_text = bleach.clean(raw_text, strip=True)[:10000]
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("scrapling_fetch", duration_ms=duration_ms, success=True, url=url)
        return {
            "status": "success",
            "url": url,
            "content": clean_text,
            "status_code": page.status,
        }
    except Exception:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _log.tool_call("scrapling_fetch", duration_ms=duration_ms, success=False, url=url)
        return {"status": "error", "error": "SCRAPE_FAILED", "url": url}


def scrapling_crawl(base_url: str, max_pages: int = 20) -> dict:
    """
    Crawl a site from base_url. Used by L3 Hunter for deep OSINT.
    Max 20 pages, max 10 seconds per page.
    """
    try:
        from scrapling import StealthyFetcher

        fetcher = StealthyFetcher(auto_match=False)
        pages = []
        visited: set[str] = set()
        queue = [base_url]
        while queue and len(pages) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)
            page = fetcher.get(url, timeout=10, max_content_size=200_000)
            text = page.get_all_text(ignore_tags=("script", "style"))
            clean = bleach.clean(text, strip=True)[:5000]
            pages.append({"url": url, "content": clean})
            for link in page.find_all("a", attrs={"href": True}):
                href = link.get("href", "")
                if base_url in href and href not in visited:
                    queue.append(href)
        return {
            "status": "success",
            "base_url": base_url,
            "pages": pages,
            "total": len(pages),
        }
    except Exception:
        return {"status": "error", "error": "CRAWL_FAILED", "base_url": base_url}
