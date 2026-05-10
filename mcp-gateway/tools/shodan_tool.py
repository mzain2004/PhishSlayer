import httpx

_BASE = "https://api.shodan.io"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "host_lookup":
            ip = payload.get("ip", "")
            r = await client.get(f"{_BASE}/shodan/host/{ip}", params={"key": api_key})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "ip": ip,
                "org": data.get("org"),
                "country": data.get("country_name"),
                "ports": data.get("ports", []),
                "vulns": list(data.get("vulns", {}).keys())[:10],
                "tags": data.get("tags", []),
                "hostnames": data.get("hostnames", []),
                "os": data.get("os"),
            }

        if action == "search":
            query = payload.get("query", "")
            r = await client.get(
                f"{_BASE}/shodan/host/search",
                params={"key": api_key, "query": query},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success",
                "total": data.get("total", 0),
                "matches": [
                    {"ip": m.get("ip_str"), "port": m.get("port"), "org": m.get("org")}
                    for m in data.get("matches", [])[:20]
                ],
            }

        if action == "cves":
            ip = payload.get("ip", "")
            r = await client.get(f"{_BASE}/shodan/host/{ip}", params={"key": api_key})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            vulns = list(r.json().get("vulns", {}).keys())
            return {"status": "success", "ip": ip, "cves": vulns}

    return {"error": "unknown action"}
