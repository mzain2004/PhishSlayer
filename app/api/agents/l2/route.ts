import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const L2TriggerSchema = z.object({
  alert_id: z.string().min(1),
  l1_context: z.record(z.string(), z.unknown()),
  org_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/agents/l2";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  logger.info("request_start", { route, request_id: requestId, user_id: userId, org_id: orgId });

  let body: z.infer<typeof L2TriggerSchema>;
  try {
    body = L2TriggerSchema.parse(await request.json());
  } catch {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, error_code: "INVALID_REQUEST" });
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const agentServiceUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";

  try {
    logger.info("agent_dispatched", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L2" });

    const resp = await fetch(`${agentServiceUrl}/agents/l2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, org_id: orgId }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L2", duration_ms: Date.now() - start, error_code: "AGENT_SERVICE_ERROR" });
      return NextResponse.json({ error: "AGENT_SERVICE_ERROR" }, { status: 502 });
    }

    const data = await resp.json();
    logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L2", duration_ms: Date.now() - start });
    return NextResponse.json(data);
  } catch {
    logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L2", duration_ms: Date.now() - start, error_code: "AGENT_UNAVAILABLE" });
    return NextResponse.json({ error: "AGENT_UNAVAILABLE" }, { status: 503 });
  }
}
