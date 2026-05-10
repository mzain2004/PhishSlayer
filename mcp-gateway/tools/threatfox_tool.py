import httpx

_BASE = "https://threatfox-api.abuse.ch/api/v1/"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "search_ioc":
            ioc = payload.get("ioc", "")
            r = await client.post(_BASE, json={"query": "search_ioc", "search_term": ioc})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "ioc": ioc,
                "query_status": data.get("query_status"),
                "data": data.get("data", [])[:10],
            }

        if action == "get_ioc":
            ioc_id = payload.get("ioc_id", "")
            r = await client.post(_BASE, json={"query": "ioc", "id": ioc_id})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "data": r.json()}

        if action == "get_malware_iocs":
            malware = payload.get("malware", "")
            r = await client.post(
                _BASE,
                json={"query": "malware_list"},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "data": r.json().get("data", [])}

        if action == "recent_iocs":
            days = payload.get("days", 3)
            r = await client.post(_BASE, json={"query": "get_iocs", "days": days})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {"status": "success", "iocs": data.get("data", [])[:20]}

    return {"error": "unknown action"}
