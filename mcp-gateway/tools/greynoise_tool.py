import httpx

_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    headers = {"key": api_key} if api_key and api_key != "no_key_needed" else {}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "check_ip":
            ip = payload.get("ip", "")
            r = await client.get(
                f"https://api.greynoise.io/v3/community/{ip}",
                headers=headers,
            )
            if r.status_code == 429:
                return {"status": "error", "error": "GREYNOISE_RATE_LIMITED"}
            if r.status_code == 404:
                return {"status": "not_found", "ip": ip}
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", **r.json()}

        if action == "riot_check":
            ip = payload.get("ip", "")
            r = await client.get(
                f"https://api.greynoise.io/v1/riot/{ip}",
                headers={"key": api_key} if api_key else {},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", **r.json()}

        if action == "quick":
            ips = payload.get("ips", [])
            r = await client.post(
                "https://api.greynoise.io/v1/noise/quick",
                headers={"key": api_key} if api_key else {},
                json=ips,
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "results": r.json()}

    return {"error": "unknown action"}
