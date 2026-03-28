import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getBillingPortal() {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get billing_customer_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("billing_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.billing_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found.", redirect: "/pricing" },
        { status: 400 },
      );
    }

    const customerId = profile.billing_customer_id;

    // 3. Call Paddle portal session API
    const response = await fetch(
      `https://api.paddle.com/customers/${customerId}/portal-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: [{ type: "subscription_management" }],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Paddle Portal Session Error:", errorData);
      return NextResponse.json(
        { error: "Failed to create billing portal session" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // 4. Return portal URL
    return NextResponse.json({ url: data.data.urls[0].url });
  } catch (error) {
    console.error("Billing Portal Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return getBillingPortal();
}

export async function POST() {
  return getBillingPortal();
}
