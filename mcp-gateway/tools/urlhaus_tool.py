import httpx

_BASE = "https://urlhaus-api.abuse.ch/v1"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "lookup_url":
            url = payload.get("url", "")
            r = await client.post(f"{_BASE}/url/", data={"url": url})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "url": url,
                "query_status": data.get("query_status"),
                "threat": data.get("threat"),
                "tags": data.get("tags", []),
                "blacklists": data.get("blacklists", {}),
            }

        if action == "lookup_host":
            host = payload.get("host", "")
            r = await client.post(f"{_BASE}/host/", data={"host": host})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "host": host,
                "query_status": data.get("query_status"),
                "url_count": data.get("urlhaus_reference", ""),
                "urls": data.get("urls", [])[:10],
            }

        if action == "lookup_hash":
            md5_hash = payload.get("md5", "") or payload.get("sha256", "")
            r = await client.post(f"{_BASE}/payload/", data={"md5_hash": md5_hash} if len(md5_hash) == 32 else {"sha256_hash": md5_hash})
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "data": r.json()}

    return {"error": "unknown action"}
