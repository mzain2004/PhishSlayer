import { NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PolarTierSchema = z.enum(["free", "soc_pro", "command_center"]);

const PolarWebhookSchema = z.object({
  type: z.enum([
    "subscription.created",
    "subscription.updated",
    "subscription.canceled",
    "order.created",
  ]),
  data: z
    .object({
      metadata: z
        .object({
          orgId: z.string().optional(),
          org_id: z.string().optional(),
        })
        .passthrough()
        .optional(),
      product: z
        .object({
          metadata: z
            .object({ tier: PolarTierSchema.optional() })
            .passthrough()
            .optional(),
        })
        .passthrough()
        .optional(),
      subscription: z
        .object({
          metadata: z
            .object({
              orgId: z.string().optional(),
              org_id: z.string().optional(),
            })
            .passthrough()
            .optional(),
          product: z
            .object({
              metadata: z
                .object({ tier: PolarTierSchema.optional() })
                .passthrough()
                .optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough()
        .optional(),
      order: z
        .object({
          metadata: z
            .object({
              orgId: z.string().optional(),
              org_id: z.string().optional(),
            })
            .passthrough()
            .optional(),
          items: z
            .array(
              z
                .object({
                  product: z
                    .object({
                      metadata: z
                        .object({ tier: PolarTierSchema.optional() })
                        .passthrough()
                        .optional(),
                    })
                    .passthrough()
                    .optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
});

function getOrgId(data: z.infer<typeof PolarWebhookSchema>["data"]) {
  return (
    data.subscription?.metadata?.orgId ||
    data.subscription?.metadata?.org_id ||
    data.order?.metadata?.orgId ||
    data.order?.metadata?.org_id ||
    data.metadata?.orgId ||
    data.metadata?.org_id ||
    null
  );
}

function getTier(data: z.infer<typeof PolarWebhookSchema>["data"]) {
  return (
    data.subscription?.product?.metadata?.tier ||
    data.product?.metadata?.tier ||
    data.order?.items?.[0]?.product?.metadata?.tier ||
    null
  );
}

async function updateOrganizationTier(
  orgId: string,
  tier: z.infer<typeof PolarTierSchema>,
) {
  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ tier })
    .eq("id", orgId);

  if (error) {
    logger.error("request_failed", {
      route: "/api/billing/webhook",
      request_id: crypto.randomUUID(),
      user_id: null,
      org_id: orgId,
      error_code: "ORG_TIER_UPDATE_FAILED",
    });
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/billing/webhook";

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("request_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      error_code: "MISSING_WEBHOOK_SECRET",
    });
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    let event: unknown;
    try {
      event = validateEvent(rawBody, headers, webhookSecret);
    } catch {
      logger.warn("auth_failed", {
        route,
        request_id: requestId,
        user_id: null,
        org_id: null,
        error_code: "INVALID_SIGNATURE",
      });
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    const parsed = PolarWebhookSchema.safeParse(event);
    if (!parsed.success) {
      logger.warn("request_failed", {
        route,
        request_id: requestId,
        user_id: null,
        org_id: null,
        error_code: "INVALID_PAYLOAD",
      });
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    const { type, data } = parsed.data;
    logger.info("webhook_received", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      metadata: { source: "polar", event_type: type },
    });

    const orgId = getOrgId(data);
    const tier = getTier(data);

    if (orgId && type === "subscription.canceled") {
      await updateOrganizationTier(orgId, "free");
    }

    if (
      orgId &&
      (type === "subscription.created" ||
        type === "subscription.updated" ||
        type === "order.created")
    ) {
      await updateOrganizationTier(orgId, tier || "free");
    }

    logger.info("request_complete", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      duration_ms: Date.now() - start,
      metadata: { source: "polar", event_type: type },
    });
    return NextResponse.json({ received: true });
  } catch {
    logger.error("request_failed", {
      route,
      request_id: requestId,
      user_id: null,
      org_id: null,
      duration_ms: Date.now() - start,
      error_code: "PROCESSING_ERROR",
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
