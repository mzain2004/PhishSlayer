import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaddleListResponse = {
  data?: Array<{ id?: string }>;
  error?: { detail?: string };
};

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("billing_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Billing profile fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 },
      );
    }

    if (!profile?.billing_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      return NextResponse.json(
        { error: "Billing integration not configured" },
        { status: 500 },
      );
    }

    const customerId = profile.billing_customer_id;
    const listUrl = new URL("https://api.paddle.com/subscriptions");
    listUrl.searchParams.set("customer_id", customerId);
    listUrl.searchParams.set("status", "active");

    const listResponse = await fetch(listUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const listPayload = (await listResponse.json().catch(() => ({}))) as PaddleListResponse;

    if (!listResponse.ok) {
      console.error("Paddle list subscriptions error:", listPayload);
      return NextResponse.json(
        {
          error:
            listPayload?.error?.detail || "Failed to list active subscriptions",
        },
        { status: listResponse.status },
      );
    }

    const subscriptionId = listPayload.data?.[0]?.id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    const cancelResponse = await fetch(
      `https://api.paddle.com/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paddleApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ effective_from: "next_billing_period" }),
      },
    );

    const cancelPayload = (await cancelResponse.json().catch(() => ({}))) as {
      error?: { detail?: string };
    };

    if (!cancelResponse.ok) {
      console.error("Paddle cancel subscription error:", cancelPayload);
      return NextResponse.json(
        {
          error:
            cancelPayload?.error?.detail || "Failed to cancel subscription",
        },
        { status: cancelResponse.status },
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "recon",
        billing_customer_id: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Billing profile update error:", updateError);
      return NextResponse.json(
        { error: "Subscription canceled, but local update failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Billing cancel route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
