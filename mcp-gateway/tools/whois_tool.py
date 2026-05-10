import httpx

_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "lookup":
            target = payload.get("target", "") or payload.get("domain", "") or payload.get("ip", "")
            r = await client.get(
                "https://api.hackertarget.com/whois/",
                params={"q": target},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            text = r.text.strip()
            if "API count exceeded" in text:
                return {"status": "error", "error": "RATE_LIMITED"}
            return {"status": "success", "target": target, "raw": text[:3000]}

        if action == "rdap":
            domain = payload.get("domain", "")
            r = await client.get(f"https://rdap.org/domain/{domain}")
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "domain": domain,
                "registrar": next(
                    (e.get("publicIds", [{}])[0].get("identifier") for e in data.get("entities", []) if "registrar" in e.get("roles", [])),
                    None,
                ),
                "registered": data.get("events", [{}])[0].get("eventDate") if data.get("events") else None,
                "nameservers": [ns.get("ldhName") for ns in data.get("nameservers", [])],
                "status": data.get("status", []),
            }

    return {"error": "unknown action"}
