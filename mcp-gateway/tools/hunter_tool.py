import httpx

_BASE = "https://api.hunter.io/v2"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "verify_email":
            email = payload.get("email", "")
            r = await client.get(
                f"{_BASE}/email-verifier",
                params={"email": email, "api_key": api_key},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "email": email, "data": r.json().get("data", {})}

        if action == "domain_search":
            domain = payload.get("domain", "")
            r = await client.get(
                f"{_BASE}/domain-search",
                params={"domain": domain, "api_key": api_key, "limit": 10},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json().get("data", {})
            return {
                "status": "success", "domain": domain,
                "emails": data.get("emails", [])[:10],
                "organization": data.get("organization"),
                "country": data.get("country"),
            }

        if action == "email_finder":
            domain = payload.get("domain", "")
            first_name = payload.get("first_name", "")
            last_name = payload.get("last_name", "")
            r = await client.get(
                f"{_BASE}/email-finder",
                params={"domain": domain, "first_name": first_name, "last_name": last_name, "api_key": api_key},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "data": r.json().get("data", {})}

    return {"error": "unknown action"}
