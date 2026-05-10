import httpx

_TIMEOUT = 30

_INDICATOR_QUERY = """
query SearchIndicators($search: String) {
  indicators(search: $search, first: 10) {
    edges {
      node {
        id
        name
        pattern
        indicator_types
        confidence
        created
        modified
      }
    }
  }
}
"""

_REPORT_QUERY = """
query GetReports($search: String) {
  reports(search: $search, first: 5) {
    edges {
      node {
        id
        name
        description
        published
        confidence
      }
    }
  }
}
"""


async def invoke(payload: dict, api_key: str) -> dict:
    action = payload.get("action")
    opencti_url = payload.get("opencti_url", "").rstrip("/")
    if not opencti_url:
        return {"status": "error", "error": "opencti_url required in payload"}

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if action == "search_indicators":
            search = payload.get("search", "")
            r = await client.post(
                f"{opencti_url}/graphql",
                headers=headers,
                json={"query": _INDICATOR_QUERY, "variables": {"search": search}},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            edges = r.json().get("data", {}).get("indicators", {}).get("edges", [])
            return {"status": "success", "indicators": [e["node"] for e in edges]}

        if action == "get_reports":
            search = payload.get("search", "")
            r = await client.post(
                f"{opencti_url}/graphql",
                headers=headers,
                json={"query": _REPORT_QUERY, "variables": {"search": search}},
            )
            if r.status_code != 200:
                return {"status": "error", "code": r.status_code}
            edges = r.json().get("data", {}).get("reports", {}).get("edges", [])
            return {"status": "success", "reports": [e["node"] for e in edges]}

    return {"error": "unknown action"}
