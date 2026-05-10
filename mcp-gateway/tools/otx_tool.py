import httpx

_BASE = "https://otx.alienvault.com/api/v1"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    headers = {"X-OTX-API-KEY": api_key}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "lookup_ip":
            ip = payload.get("ip", "")
            r = await client.get(f"{_BASE}/indicators/IPv4/{ip}/general", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "ip": ip,
                "pulse_count": data.get("pulse_info", {}).get("count", 0),
                "reputation": data.get("reputation", 0),
                "country_name": data.get("country_name"),
                "asn": data.get("asn"),
            }

        if action == "lookup_domain":
            domain = payload.get("domain", "")
            r = await client.get(f"{_BASE}/indicators/domain/{domain}/general", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "domain": domain,
                "pulse_count": data.get("pulse_info", {}).get("count", 0),
                "alexa": data.get("alexa"),
            }

        if action == "lookup_hash":
            file_hash = payload.get("hash", "")
            r = await client.get(f"{_BASE}/indicators/file/{file_hash}/general", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "hash": file_hash,
                "pulse_count": data.get("pulse_info", {}).get("count", 0),
                "malware_families": data.get("malware_families", []),
            }

        if action == "search_pulses":
            query = payload.get("query", "")
            r = await client.get(
                f"{_BASE}/search/pulses",
                headers=headers,
                params={"q": query, "limit": 10},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "results": r.json().get("results", [])[:10]}

    return {"error": "unknown action"}
