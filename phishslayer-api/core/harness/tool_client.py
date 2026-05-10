"""
Gateway client — all external tool calls route through the MCP gateway.
Credentials are resolved by the gateway: org key > PhishSlayer default.
"""
import os
import httpx

GATEWAY_URL = os.environ.get("MCP_GATEWAY_URL", "http://mcp-gateway:9000")
_TIMEOUT = 30


async def call_tool(
    tool_name: str,
    action: str,
    params: dict,
    org_id: str = "system",
    request_id: str = "",
) -> dict:
    """Call any tool via the MCP gateway. Never raises — returns error dict on failure."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                f"{GATEWAY_URL}/mcp/{tool_name}/invoke",
                json={"action": action, **params},
                headers={
                    "x-org-id": org_id,
                    "x-request-id": request_id,
                },
            )
        if r.status_code == 404:
            return {"status": "error", "error": f"{tool_name.upper()}_NOT_CONFIGURED"}
        r.raise_for_status()
        return r.json()
    except httpx.TimeoutException:
        return {"status": "error", "error": f"{tool_name.upper()}_GATEWAY_TIMEOUT"}
    except httpx.ConnectError:
        return {"status": "error", "error": f"{tool_name.upper()}_GATEWAY_UNREACHABLE"}
    except Exception as exc:
        return {"status": "error", "error": f"{tool_name.upper()}_GATEWAY_ERROR", "detail": str(exc)}
