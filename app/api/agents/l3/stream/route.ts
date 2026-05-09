import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/agents/l3/stream";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const alertId = request.nextUrl.searchParams.get("alertId");
  if (!alertId) {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, error_code: "MISSING_ALERT_ID" });
    return new Response("MISSING_ALERT_ID", { status: 400 });
  }

  logger.info("request_start", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: alertId });

  // Verify the alert belongs to this org
  const supabase = await createClient();
  const { data: alert, error } = await supabase
    .from("alerts")
    .select("id")
    .eq("id", alertId)
    .eq("organization_id", orgId)
    .single();

  if (error || !alert) {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: alertId, error_code: "ALERT_NOT_FOUND" });
    return new Response("ALERT_NOT_FOUND", { status: 404 });
  }

  const agentServiceUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";
  const redisChannel = `agent-trace:${alertId}`;

  logger.info("agent_dispatched", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: alertId, agent_level: "L3" });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const close = () => {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch {}
        }
      };

      // Poll the agent service for SSE events (acts as Redis proxy)
      try {
        const resp = await fetch(
          `${agentServiceUrl}/agents/l3/stream?alert_id=${alertId}&org_id=${orgId}`,
          {
            headers: { Accept: "text/event-stream" },
            signal: AbortSignal.timeout(120_000),
          }
        );

        if (!resp.ok || !resp.body) {
          logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: alertId, agent_level: "L3", duration_ms: Date.now() - start, error_code: "AGENT_UNAVAILABLE" });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "AGENT_UNAVAILABLE" })}\n\n`)
          );
          close();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(chunk));

          // Check for report_ready signal to close
          if (chunk.includes("report_ready")) {
            logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: alertId, agent_level: "L3", duration_ms: Date.now() - start });
            break;
          }
        }
      } catch {
        if (!closed) {
          logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: alertId, agent_level: "L3", duration_ms: Date.now() - start, error_code: "STREAM_FAILED" });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "STREAM_FAILED" })}\n\n`)
          );
        }
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
