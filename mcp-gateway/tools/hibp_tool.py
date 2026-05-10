import httpx

_BASE = "https://haveibeenpwned.com/api/v3"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    headers = {"hibp-api-key": api_key, "User-Agent": "PhishSlayer"}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "check_email":
            email = payload.get("email", "")
            r = await client.get(
                f"{_BASE}/breachedaccount/{email}",
                headers=headers,
                params={"truncateResponse": "false"},
            )
            if r.status_code == 404:
                return {"status": "success", "email": email, "breaches": [], "pwned": False}
            if r.status_code == 401:
                return {"status": "error", "error": "HIBP_AUTH_FAILED"}
            if r.status_code == 429:
                return {"status": "error", "error": "HIBP_RATE_LIMITED"}
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            breaches = r.json()
            return {"status": "success", "email": email, "breaches": breaches, "pwned": True}

        if action == "check_domain":
            domain = payload.get("domain", "")
            r = await client.get(f"{_BASE}/breacheddomain/{domain}", headers=headers)
            if r.status_code == 404:
                return {"status": "success", "domain": domain, "breaches": {}}
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "domain": domain, "breaches": r.json()}

        if action == "get_breaches":
            r = await client.get(f"{_BASE}/breaches", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "breaches": r.json()}

    return {"error": "unknown action"}
