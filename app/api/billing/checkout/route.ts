import { NextResponse } from "next/server";
import { z } from "zod";
import { polar } from "@/lib/billing/polar";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CheckoutSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
});

export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized: No organization selected" }, { status: 401 });
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Billing service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const result = CheckoutSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const { plan } = result.data;
    const productId = plan === 'pro' 
      ? process.env.POLAR_PRO_PRODUCT_ID 
      : process.env.POLAR_ENTERPRISE_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json({ error: "Product ID not configured" }, { status: 500 });
    }

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: 'https://phishslayer.tech/dashboard?upgraded=true',
      metadata: { orgId }
    });

    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error("[Checkout] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
