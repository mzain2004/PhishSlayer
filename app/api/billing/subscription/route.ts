import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  TIER_FEATURE_LIMITS,
  type BillingTier,
  normalizeBillingTier,
} from "@/lib/polar-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let tier = normalizeBillingTier(
      (subscription?.tier as string | null | undefined) || "free",
    ) as BillingTier;

    if (!subscription?.tier) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();

      tier = normalizeBillingTier(profile?.subscription_tier || "free");
    }

    const status = subscription?.status || "active";

    return NextResponse.json({
      tier,
      status,
      current_period_end: subscription?.current_period_end || null,
      features: TIER_FEATURE_LIMITS[tier],
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
