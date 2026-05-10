import httpx

_TIMEOUT = 30


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    misp_url = payload.get("misp_url", "").rstrip("/")
    if not misp_url:
        return {"status": "error", "error": "misp_url required in payload"}

    headers = {
        "Authorization": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as client:
        if action == "search_events":
            search = payload.get("search", {})
            r = await client.post(
                f"{misp_url}/events/restSearch",
                headers=headers,
                json={"returnFormat": "json", "limit": 10, **search},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "events": r.json().get("response", [])}

        if action == "add_attribute":
            event_id = payload.get("event_id", "")
            attribute = payload.get("attribute", {})
            r = await client.post(
                f"{misp_url}/attributes/add/{event_id}",
                headers=headers,
                json=attribute,
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "attribute": r.json()}

        if action == "search_attributes":
            search = payload.get("search", {})
            r = await client.post(
                f"{misp_url}/attributes/restSearch",
                headers=headers,
                json={"returnFormat": "json", "limit": 20, **search},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            return {"status": "success", "attributes": r.json().get("response", {}).get("Attribute", [])}

    return {"error": "unknown action"}
