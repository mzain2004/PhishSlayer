import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/security/rate-limit";
import { WazuhAlertSchema } from "@/lib/schemas/wazuh-webhook.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/webhooks/wazuh";

  // Wazuh sends webhook payloads here
  const providedSecret = request.headers.get("x-wazuh-webhook-secret") ?? "";
  const expected = process.env.WAZUH_WEBHOOK_SECRET ?? "";
  if (!expected || !safeEqual(providedSecret, expected)) {
    logger.warn("auth_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      error_code: "UNAUTHORIZED",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by source IP (after signature verification to prevent timing attacks)
  const clientIp = (request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown") as string;
  const { allowed, retryAfterSeconds } = await rateLimit(
    `webhook:wazuh:${clientIp}`,
    200,
    60,
  );
  if (!allowed) {
    logger.warn("rate_limit_exceeded", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      error_code: "RATE_LIMITED",
      metadata: { client_ip: clientIp },
    });
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": retryAfterSeconds.toString() },
      },
    );
  }

  // Get orgId from query param or header (assuming multi-tenant webhook setup)
  const orgId = request.nextUrl.searchParams.get("organization_id");
  if (!orgId) {
    logger.warn("validation_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      error_code: "MISSING_ORG_ID",
    });
    return NextResponse.json(
      { error: "Missing organization_id" },
      { status: 400 },
    );
  }

  logger.info("webhook_received", {
    route,
    request_id: requestId,
    user_id: null,
    org_id: orgId,
    metadata: { source: "wazuh" },
  });

  const rawAlert = await request.text();

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawAlert);
  } catch {
    logger.warn("validation_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: orgId,
      error_code: "INVALID_JSON",
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = WazuhAlertSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    console.error("wazuh_webhook_validation_failed", {
      errors: parseResult.error.issues.map((e) => ({ path: e.path, message: e.message })),
      source_ip: clientIp,
    });
    logger.warn("validation_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: orgId,
      error_code: "INVALID_PAYLOAD",
    });
    return NextResponse.json({ error: "Invalid payload structure" }, { status: 422 });
  }

  const connectorId = "00000000-0000-0000-0000-000000000000"; // Default wazuh connector ID

  // Background processing - do not await
  const supabase = getAdminClient();
  const pipeline = new IngestionPipeline(supabase);

  pipeline.ingestEvent(rawAlert, connectorId, orgId, "wazuh").catch((_err) => {
    logger.error("request_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: orgId,
      duration_ms: Date.now() - start,
      error_code: "PIPELINE_ERROR",
    });
  });

  logger.info("request_complete", {
    route,
    request_id: requestId,
    user_id: null,
    org_id: orgId,
    duration_ms: Date.now() - start,
    metadata: { source: "wazuh" },
  });
  return NextResponse.json(
    { success: true, message: "Accepted" },
    { status: 200 },
  );
}
