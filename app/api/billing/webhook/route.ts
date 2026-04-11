import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { productIdToTier, type BillingTier } from "@/lib/polar-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function roleForTier(tier: BillingTier): "analyst" | "pro" | "enterprise" {
  if (tier === "enterprise") return "enterprise";
  if (tier === "pro") return "pro";
  return "analyst";
}

function profileTierForBillingTier(
  tier: BillingTier,
): "recon" | "soc_pro" | "command_control" {
  if (tier === "enterprise") return "command_control";
  if (tier === "pro") return "soc_pro";
  return "recon";
}

function extractProductId(data: any): string {
  return (
    data?.productId ||
    data?.product_id ||
    data?.product?.id ||
    data?.product?.productId ||
    ""
  );
}

function extractUserId(data: any): string | null {
  const direct = data?.metadata?.userId || data?.metadata?.user_id;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }
  return null;
}

export async function POST(request: Request) {
  const client = adminClient();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET || "";

  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    if (!webhookSecret) {
      console.error("POLAR_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ received: true });
    }

    let event: any;
    try {
      event = validateEvent(body, headers, webhookSecret);
    } catch (error) {
      console.error("Invalid Polar webhook signature", error);
      return NextResponse.json({ received: true });
    }

    const type = event?.type;
    const data = event?.data || {};

    if (type === "subscription.created" || type === "subscription.updated") {
      const productId = extractProductId(data);
      const tier = productIdToTier(productId);
      const userIdFromMetadata = extractUserId(data);

      let userId = userIdFromMetadata;
      if (!userId && data?.id) {
        const { data: existingSub } = await client
          .from("subscriptions")
          .select("user_id")
          .eq("polar_subscription_id", data.id)
          .maybeSingle();
        userId = (existingSub?.user_id as string | undefined) || null;
      }

      if (userId) {
        await client.from("subscriptions").upsert(
          {
            user_id: userId,
            tier,
            status: "active",
            polar_subscription_id: data.id || null,
            polar_customer_id: data.customerId || data.customer_id || null,
            current_period_end:
              data.currentPeriodEnd || data.current_period_end || null,
            product_id: productId || null,
          },
          { onConflict: "user_id" },
        );

        await client
          .from("profiles")
          .update({
            role: roleForTier(tier),
            subscription_tier: profileTierForBillingTier(tier),
          })
          .eq("id", userId);
      }
    }

    if (type === "subscription.canceled" || type === "subscription.revoked") {
      const userIdFromMetadata = extractUserId(data);
      let userId = userIdFromMetadata;

      if (!userId && data?.id) {
        const { data: existingSub } = await client
          .from("subscriptions")
          .select("user_id")
          .eq("polar_subscription_id", data.id)
          .maybeSingle();
        userId = (existingSub?.user_id as string | undefined) || null;
      }

      if (userId) {
        await client
          .from("subscriptions")
          .update({ status: "canceled", tier: "free" })
          .eq("user_id", userId);

        await client
          .from("profiles")
          .update({ role: "analyst", subscription_tier: "recon" })
          .eq("id", userId);
      }
    }
  } catch (error) {
    console.error("Polar webhook processing error", error);
  }

  return NextResponse.json({ received: true });
}
