import httpx
import os

_BASE = "https://search.censys.io/api"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    # Censys uses API ID + Secret; api_key format: "api_id:api_secret"
    if ":" in api_key:
        api_id, api_secret = api_key.split(":", 1)
        auth = (api_id, api_secret)
    else:
        api_id = os.environ.get("CENSYS_API_ID", "")
        api_secret = api_key
        auth = (api_id, api_secret)

    async with httpx.AsyncClient(timeout=_TIMEOUT, auth=auth) as client:
        if action == "search_ip":
            query = payload.get("query", "") or payload.get("ip", "")
            r = await client.get(
                f"{_BASE}/v2/hosts/search",
                params={"q": query, "per_page": 10},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success",
                "total": data.get("result", {}).get("total", 0),
                "hits": data.get("result", {}).get("hits", [])[:10],
            }

        if action == "view_ip":
            ip = payload.get("ip", "")
            r = await client.get(f"{_BASE}/v2/hosts/{ip}")
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            result = r.json().get("result", {})
            return {
                "status": "success", "ip": ip,
                "autonomous_system": result.get("autonomous_system"),
                "location": result.get("location"),
                "services": [
                    {"port": s.get("port"), "transport_protocol": s.get("transport_protocol"), "service_name": s.get("service_name")}
                    for s in result.get("services", [])[:20]
                ],
            }

        if action == "search_domain":
            query = payload.get("query", "") or payload.get("domain", "")
            r = await client.get(
                f"{_BASE}/v2/certificates/search",
                params={"q": query, "per_page": 10},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "results": r.json().get("result", {}).get("hits", [])[:10]}

    return {"error": "unknown action"}
