import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/ingest/webhook";

  const ingestKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!ingestKey || ingestKey !== process.env.INGEST_API_KEY) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const connectorId = request.nextUrl.searchParams.get("connector");
  const orgId = request.headers.get("x-org-id");

  if (!connectorId || !orgId) {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: null, org_id: orgId ?? null, error_code: "MISSING_ROUTING_PARAMS" });
    return NextResponse.json({ error: "Missing routing params" }, { status: 400 });
  }

  logger.info("webhook_received", { route, request_id: requestId, user_id: null, org_id: orgId, metadata: { source: "connector", connector_id: connectorId } });

  try {
    const rawBody = await request.text();

    const supabase = await createClient();
    const pipeline = new IngestionPipeline(supabase);

    try {
      await pipeline.ingestEvent(rawBody, connectorId, orgId);
      logger.info("request_complete", { route, request_id: requestId, user_id: null, org_id: orgId, duration_ms: Date.now() - start });
      return NextResponse.json({ success: true, message: "Accepted" }, { status: 200 });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.startsWith('quota_exceeded')) {
        const [, limit] = errMsg.split(':');
        logger.warn("request_failed", { route, request_id: requestId, user_id: null, org_id: orgId, duration_ms: Date.now() - start, error_code: "QUOTA_EXCEEDED" });
        return NextResponse.json({
          error: 'quota_exceeded',
          metric: 'alerts_processed',
          limit: parseInt(limit),
        }, { status: 429 });
      }
      throw err;
    }
  } catch {
    logger.error("request_failed", { route, request_id: requestId, user_id: null, org_id: orgId, duration_ms: Date.now() - start, error_code: "SERVER_ERROR" });
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
