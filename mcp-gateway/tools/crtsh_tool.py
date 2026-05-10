import httpx

_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "search_domain":
            domain = payload.get("domain", "")
            r = await client.get(
                "https://crt.sh/",
                params={"q": f"%.{domain}", "output": "json"},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            certs = r.json()[:50]
            subdomains = list({c.get("name_value", "").strip() for c in certs if c.get("name_value")})
            return {
                "status": "success", "domain": domain,
                "count": len(certs),
                "subdomains": subdomains[:50],
            }

        if action == "search_issuer":
            issuer = payload.get("issuer", "")
            r = await client.get(
                "https://crt.sh/",
                params={"q": issuer, "output": "json"},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "results": r.json()[:20]}

    return {"error": "unknown action"}
