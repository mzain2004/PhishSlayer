import httpx

_BASE = "https://www.virustotal.com/api/v3"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    headers = {"x-apikey": api_key}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "check_ip":
            ip = payload.get("ip", "")
            r = await client.get(f"{_BASE}/ip_addresses/{ip}", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            return {
                "status": "success", "ip": ip,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "undetected": stats.get("undetected", 0),
                "reputation": data.get("reputation", 0),
            }

        if action == "check_url":
            url = payload.get("url", "")
            import base64
            url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
            r = await client.get(f"{_BASE}/urls/{url_id}", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            stats = r.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            return {
                "status": "success", "url": url,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
            }

        if action == "check_domain":
            domain = payload.get("domain", "")
            r = await client.get(f"{_BASE}/domains/{domain}", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            return {
                "status": "success", "domain": domain,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "reputation": data.get("reputation", 0),
            }

        if action == "check_hash":
            file_hash = payload.get("hash", "")
            r = await client.get(f"{_BASE}/files/{file_hash}", headers=headers)
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            return {
                "status": "success", "hash": file_hash,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "name": data.get("meaningful_name", ""),
            }

    return {"error": "unknown action"}
