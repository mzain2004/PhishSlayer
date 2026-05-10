import httpx
import asyncio

_BASE = "https://urlscan.io/api/v1"
_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "submit":
            url = payload.get("url", "")
            r = await client.post(
                f"{_BASE}/scan/",
                headers={"API-Key": api_key, "Content-Type": "application/json"},
                json={"url": url, "visibility": "private"},
            )
            if r.status_code == 401:
                return {"status": "error", "error": "URLSCAN_AUTH_FAILED"}
            if r.status_code == 429:
                return {"status": "error", "error": "URLSCAN_RATE_LIMITED"}
            if r.status_code not in (200, 201):
                return {"status": "error", "code": r.status_code}
            data = r.json()
            return {
                "status": "success", "url": url,
                "scan_id": data.get("uuid"),
                "result_url": data.get("result"),
                "api_url": data.get("api"),
            }

        if action == "get_result":
            scan_id = payload.get("scan_id", "")
            for _ in range(3):
                r = await client.get(
                    f"{_BASE}/result/{scan_id}/",
                    headers={"API-Key": api_key},
                )
                if r.status_code == 404:
                    await asyncio.sleep(5)
                    continue
                if r.status_code == 429:
                    return {"status": "error", "error": "URLSCAN_RATE_LIMITED"}
                if r.status_code != 200:
                    return {"status": "error", "code": r.status_code}
                data = r.json()
                verdicts = data.get("verdicts", {}).get("overall", {})
                return {
                    "status": "success", "scan_id": scan_id,
                    "malicious": verdicts.get("malicious", False),
                    "score": verdicts.get("score", 0),
                    "categories": verdicts.get("categories", []),
                    "screenshot": data.get("task", {}).get("screenshotURL"),
                }
            return {"status": "error", "error": "URLSCAN_NOT_READY"}

        if action == "search":
            query = payload.get("query", "")
            r = await client.get(
                f"{_BASE}/search/",
                headers={"API-Key": api_key},
                params={"q": query, "size": 10},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            results = r.json().get("results", [])
            return {"status": "success", "results": results[:10]}

    return {"error": "unknown action"}
