import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const L1AlertSchema = z.object({
  alert_id: z.string().min(1),
  raw_alert: z.record(z.string(), z.unknown()),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  attack_type: z.string().optional(),
  source_ip: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/agents/l1";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  logger.info("request_start", { route, request_id: requestId, user_id: userId, org_id: orgId });

  let body: z.infer<typeof L1AlertSchema>;
  try {
    body = L1AlertSchema.parse(await request.json());
  } catch {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, error_code: "INVALID_REQUEST" });
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const agentServiceUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";

  try {
    logger.info("agent_dispatched", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L1" });

    const resp = await fetch(`${agentServiceUrl}/api/v1/agents/l1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-org-id": orgId,
        "x-user-id": userId,
      },
      body: JSON.stringify({ ...body, org_id: orgId }),
    });

    if (!resp.ok) {
      logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L1", duration_ms: Date.now() - start, error_code: "AGENT_SERVICE_ERROR" });
      return NextResponse.json({ error: "AGENT_SERVICE_ERROR" }, { status: 502 });
    }

    const data = await resp.json();
    logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L1", duration_ms: Date.now() - start });
    return NextResponse.json({ success: true, job_id: data.job_id ?? body.alert_id, result: data }, { status: 200 });
  } catch {
    logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alert_id, agent_level: "L1", duration_ms: Date.now() - start, error_code: "AGENT_SERVICE_UNAVAILABLE" });
    return NextResponse.json({ error: "AGENT_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}
