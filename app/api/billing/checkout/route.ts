import { NextResponse } from "next/server";
import { z } from "zod";
import { polar } from "@/lib/polar-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CheckoutSchema = z.object({
  productId: z.string().min(1),
  userId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const payload = CheckoutSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const allowedProducts = [
      process.env.POLAR_FREE_PRODUCT_ID,
      process.env.POLAR_SOC_PRO_MONTHLY_ID,
      process.env.POLAR_SOC_PRO_ANNUAL_ID,
      process.env.POLAR_CC_MONTHLY_ID,
      process.env.POLAR_CC_ANNUAL_ID,
    ].filter(Boolean) as string[];

    if (
      allowedProducts.length > 0 &&
      !allowedProducts.includes(payload.data.productId)
    ) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const checkout = await polar.checkouts.create({
      products: [payload.data.productId],
      customerEmail: payload.data.email,
      externalCustomerId: payload.data.userId,
      metadata: { userId: payload.data.userId },
    });

    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create checkout",
      },
      { status: 500 },
    );
  }
}
