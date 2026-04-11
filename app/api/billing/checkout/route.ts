import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { polar } from "@/lib/polar-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CheckoutSchema = z.object({
  productId: z.string().min(1),
  successUrl: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const payload = CheckoutSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checkout = await polar.checkouts.create({
      products: [payload.data.productId],
      customerEmail: user.email || undefined,
      successUrl: payload.data.successUrl,
      metadata: { userId: user.id },
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
