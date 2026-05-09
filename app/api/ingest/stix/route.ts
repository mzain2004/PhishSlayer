import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/ingest/stix";

  const ingestKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!ingestKey || ingestKey !== process.env.INGEST_API_KEY) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "MISSING_ROUTING_PARAMS" });
    return NextResponse.json({ error: "Missing organization context" }, { status: 400 });
  }

  logger.info("webhook_received", { route, request_id: requestId, user_id: null, org_id: orgId, metadata: { source: "stix" } });

  try {
    const bundle = await request.json();
    if (bundle.type !== "bundle" || !Array.isArray(bundle.objects)) {
      logger.warn("validation_failed", { route, request_id: requestId, user_id: null, org_id: orgId, error_code: "INVALID_STIX_BUNDLE" });
      return NextResponse.json({ error: "Invalid STIX bundle" }, { status: 400 });
    }

    const supabase = await createClient();
    let imported = 0;

    for (const obj of bundle.objects) {
      if (obj.type === "indicator") {
        const valueMatch = obj.pattern.match(/'(.*?)'/);
        if (valueMatch) {
          await supabase.from("watchlists").insert({
            org_id: orgId,
            ioc_type: obj.pattern_type || "stix",
            ioc_value: valueMatch[1],
            label: obj.name || "STIX Import",
            source: "taxii",
          });
          imported++;
        }
      }
    }

    logger.info("request_complete", { route, request_id: requestId, user_id: null, org_id: orgId, duration_ms: Date.now() - start, metadata: { imported } });
    return NextResponse.json({ success: true, imported }, { status: 200 });
  } catch {
    logger.error("request_failed", { route, request_id: requestId, user_id: null, org_id: orgId, duration_ms: Date.now() - start, error_code: "SERVER_ERROR" });
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
