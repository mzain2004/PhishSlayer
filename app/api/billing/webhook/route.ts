import { NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/billing/webhook";

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("request_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "MISSING_WEBHOOK_SECRET" });
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    let event: any;
    try {
      event = validateEvent(rawBody, headers, webhookSecret);
    } catch {
      logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "INVALID_SIGNATURE" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { type, data } = event;
    logger.info("webhook_received", { route, request_id: requestId, user_id: null, org_id: null, metadata: { source: "polar", event_type: type } });

    if (type === 'order.created' || type === 'subscription.active' || type === 'subscription.created') {
      const orgId = data.metadata?.orgId;
      const productId = data.product_id || data.product?.id;

      if (orgId) {
        let plan = 'free';
        if (productId === process.env.POLAR_PRO_PRODUCT_ID) plan = 'pro';
        if (productId === process.env.POLAR_ENTERPRISE_PRODUCT_ID) plan = 'enterprise';

        await supabaseAdmin
          .from('organizations')
          .update({ plan })
          .eq('id', orgId);
      }
    }

    if (type === 'subscription.canceled' || type === 'subscription.revoked') {
      const orgId = data.metadata?.orgId;
      if (orgId) {
        await supabaseAdmin
          .from('organizations')
          .update({ plan: 'free' })
          .eq('id', orgId);
      }
    }

    if (type === 'subscription.updated') {
      const orgId = data.metadata?.orgId;
      const productId = data.product_id || data.product?.id;

      if (orgId) {
        let plan = 'free';
        if (productId === process.env.POLAR_PRO_PRODUCT_ID) plan = 'pro';
        if (productId === process.env.POLAR_ENTERPRISE_PRODUCT_ID) plan = 'enterprise';

        await supabaseAdmin
          .from('organizations')
          .update({ plan })
          .eq('id', orgId);
      }
    }

    logger.info("request_complete", { route, request_id: requestId, user_id: null, org_id: null, duration_ms: Date.now() - start, metadata: { source: "polar", event_type: type } });
    return NextResponse.json({ received: true });
  } catch {
    logger.error("request_failed", { route, request_id: requestId, user_id: null, org_id: null, duration_ms: Date.now() - start, error_code: "PROCESSING_ERROR" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
