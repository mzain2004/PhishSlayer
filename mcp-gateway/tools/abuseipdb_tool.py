import httpx

_BASE = "https://api.abuseipdb.com/api/v2"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "check_ip":
            ip = payload.get("ip", "")
            r = await client.get(
                f"{_BASE}/check",
                headers={"Key": api_key, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 90},
            )
            if r.status_code == 401:
                return {"status": "error", "error": "ABUSEIPDB_AUTH_FAILED"}
            if r.status_code == 429:
                return {"status": "error", "error": "ABUSEIPDB_RATE_LIMITED"}
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json().get("data", {})
            return {
                "status": "success", "ip": ip,
                "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
                "total_reports": data.get("totalReports", 0),
                "country_code": data.get("countryCode", ""),
                "is_tor": data.get("isTor", False),
                "is_public": data.get("isPublic", True),
            }

        if action == "reports":
            ip = payload.get("ip", "")
            r = await client.get(
                f"{_BASE}/reports",
                headers={"Key": api_key, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 30, "perPage": 10},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "ip": ip, "reports": r.json().get("data", {}).get("results", [])}

    return {"error": "unknown action"}
