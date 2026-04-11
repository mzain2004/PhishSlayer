import { createClient } from "@supabase/supabase-js";
import {
  TIER_FEATURE_LIMITS,
  type BillingTier,
  normalizeBillingTier,
} from "@/lib/polar-client";

const FEATURE_REQUIRED_TIER: Record<string, "pro" | "enterprise" | "free"> = {
  url_scan: "free",
  agent_l2: "pro",
  agent_l3: "pro",
  multi_org: "enterprise",
  static_analysis: "pro",
  sigma_rules: "pro",
};

const FEATURE_LIMITS: Record<string, number> = {
  url_scan: 100,
  agent_l2: -1,
  agent_l3: -1,
  multi_org: 1,
  static_analysis: -1,
  sigma_rules: -1,
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function tierRank(tier: BillingTier): number {
  if (tier === "enterprise") return 3;
  if (tier === "pro") return 2;
  return 1;
}

function monthStartIso() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return start.toISOString();
}

export function getTierRequiredForFeature(
  feature: string,
): "pro" | "enterprise" {
  const required = FEATURE_REQUIRED_TIER[feature] || "pro";
  return required === "free" ? "pro" : required;
}

export async function checkTierAccess(
  userId: string,
  feature: string,
): Promise<{
  allowed: boolean;
  tier: BillingTier;
  limit: number;
}> {
  const client = getServiceClient();

  const { data: subscription } = await client
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let tier: BillingTier = normalizeBillingTier(
    (subscription?.tier as string | null | undefined) || "free",
  );

  if (!subscription?.tier) {
    const { data: profile } = await client
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();

    tier = normalizeBillingTier(profile?.subscription_tier || "free");
  }

  const required = FEATURE_REQUIRED_TIER[feature] || "pro";
  const limit = FEATURE_LIMITS[feature] ?? -1;

  if (
    required !== "free" &&
    tierRank(tier) < tierRank(required as BillingTier)
  ) {
    return { allowed: false, tier, limit };
  }

  if (feature === "url_scan" && tier === "free") {
    const { count } = await client
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", monthStartIso());

    return {
      allowed: (count || 0) < TIER_FEATURE_LIMITS.free.scans,
      tier,
      limit: TIER_FEATURE_LIMITS.free.scans,
    };
  }

  return {
    allowed: true,
    tier,
    limit,
  };
}
