import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateEvent } from "@polar-sh/sdk/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

type BillingPlan =
  | "free"
  | "pro_monthly"
  | "pro_annual"
  | "enterprise_monthly"
  | "enterprise_annual";

function planFromProductId(productId: string | null | undefined): BillingPlan {
  if (!productId) return "free";

  if (productId === process.env.POLAR_SOC_PRO_MONTHLY_ID) return "pro_monthly";
  if (productId === process.env.POLAR_SOC_PRO_ANNUAL_ID) return "pro_annual";
  if (productId === process.env.POLAR_CC_MONTHLY_ID)
    return "enterprise_monthly";
  if (productId === process.env.POLAR_CC_ANNUAL_ID) return "enterprise_annual";
  if (productId === process.env.POLAR_FREE_PRODUCT_ID) return "free";

  return "free";
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

function extractCustomerExternalId(data: any): string | null {
  const externalId = data?.customer?.externalId || data?.customer?.external_id;
  if (typeof externalId === "string" && externalId.length > 0) {
    return externalId;
  }
  return null;
}

function extractCustomerEmail(data: any): string | null {
  const email =
    data?.customer?.email || data?.customerEmail || data?.customer_email;
  if (typeof email === "string" && email.length > 0) {
    return email;
  }
  return null;
}

export async function POST(request: Request) {
  if (!process.env.POLAR_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const client = adminClient();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    let event: any;
    try {
      event = validateEvent(body, headers, webhookSecret);
    } catch (error) {
      console.error("Invalid Polar webhook signature", error);
      return NextResponse.json({ received: true });
    }

    const type = event?.type;
    const data = event?.data || {};

    if (type === "checkout.created") {
      console.info("Polar checkout created", { id: data?.id || null });
      return NextResponse.json({ received: true });
    }

    if (type === "subscription.created" || type === "subscription.updated") {
      const productId = extractProductId(data);
      const plan = planFromProductId(productId);
      const userIdFromMetadata =
        extractUserId(data) || extractCustomerExternalId(data);
      const customerEmail = extractCustomerEmail(data);

      let userId = userIdFromMetadata;
      if (!userId && data?.id) {
        const { data: existingSub } = await client
          .from("subscriptions")
          .select("user_id")
          .eq("polar_subscription_id", data.id)
          .maybeSingle();
        userId = (existingSub?.user_id as string | undefined) || null;
      }

      const updatePayload = {
        plan,
        polar_customer_id:
          data.customerId || data.customer_id || data?.customer?.id || null,
        subscription_status: data.status || "active",
      };

      if (userId) {
        await client.from("users").update(updatePayload).eq("id", userId);
      } else if (customerEmail) {
        await client
          .from("users")
          .update(updatePayload)
          .eq("email", customerEmail);
      }
    }

    if (type === "subscription.canceled" || type === "subscription.revoked") {
      const userIdFromMetadata = extractUserId(data);
      const customerExternalId = extractCustomerExternalId(data);
      const customerEmail = extractCustomerEmail(data);
      let userId = userIdFromMetadata || customerExternalId;

      if (!userId && data?.id) {
        const { data: existingSub } = await client
          .from("subscriptions")
          .select("user_id")
          .eq("polar_subscription_id", data.id)
          .maybeSingle();
        userId = (existingSub?.user_id as string | undefined) || null;
      }

      const updatePayload = {
        subscription_status: "canceled",
      };

      if (userId) {
        await client.from("users").update(updatePayload).eq("id", userId);
      } else if (customerEmail) {
        await client
          .from("users")
          .update(updatePayload)
          .eq("email", customerEmail);
      }
    }
  } catch (error) {
    console.error("Polar webhook processing error", error);
  }

  return NextResponse.json({ received: true });
}
