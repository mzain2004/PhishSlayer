import httpx

_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "lookup_ip":
            ip = payload.get("ip", "")
            r = await client.get(
                "https://api.hackertarget.com/reverseiplookup/",
                params={"q": ip},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            text = r.text.strip()
            if "API count exceeded" in text or "error" in text.lower():
                return {"status": "error", "error": text}
            hostnames = [h for h in text.split("\n") if h.strip()]
            return {"status": "success", "ip": ip, "hostnames": hostnames}

        if action == "lookup_domain":
            domain = payload.get("domain", "")
            r = await client.get(
                "https://api.hackertarget.com/hostsearch/",
                params={"q": domain},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            text = r.text.strip()
            if "API count exceeded" in text or "error" in text.lower():
                return {"status": "error", "error": text}
            records = []
            for line in text.split("\n"):
                parts = line.split(",")
                if len(parts) == 2:
                    records.append({"hostname": parts[0], "ip": parts[1]})
            return {"status": "success", "domain": domain, "records": records}

        if action == "dns_lookup":
            domain = payload.get("domain", "")
            r = await client.get(
                "https://api.hackertarget.com/dnslookup/",
                params={"q": domain},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "domain": domain, "records": r.text.strip()}

    return {"error": "unknown action"}
