import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { polar } from "@/lib/polar-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing user email" },
        { status: 400 },
      );
    }

    const customers = await polar.customers.list({
      email: userEmail,
      limit: 1,
    });
    const customer = customers.result.items[0];

    if (!customer) {
      return NextResponse.json({
        plan: "free",
        status: "inactive",
        currentPeriodEnd: null,
      });
    }

    const subscriptions = await polar.subscriptions.list({
      customerId: customer.id,
      active: true,
      limit: 1,
    });
    const subscription = subscriptions.result.items[0];

    if (!subscription) {
      return NextResponse.json({
        plan: "free",
        status: "inactive",
        currentPeriodEnd: null,
      });
    }

    return NextResponse.json({
      plan: planFromProductId(subscription.productId),
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch subscription",
      },
      { status: 500 },
    );
  }
}
