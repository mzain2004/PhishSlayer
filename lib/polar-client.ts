import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  server: "production",
});

export const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID || "";
export const POLAR_ORG_SLUG = process.env.POLAR_ORG_SLUG || "";

export const POLAR_FREE_PRODUCT_ID = process.env.POLAR_FREE_PRODUCT_ID || "";
export const POLAR_PRO_MONTHLY_PRODUCT_ID =
  process.env.POLAR_PRO_MONTHLY_PRODUCT_ID || "";
export const POLAR_PRO_ANNUAL_PRODUCT_ID =
  process.env.POLAR_PRO_ANNUAL_PRODUCT_ID || "";
export const POLAR_ENTERPRISE_MONTHLY_PRODUCT_ID =
  process.env.POLAR_ENTERPRISE_MONTHLY_PRODUCT_ID || "";
export const POLAR_ENTERPRISE_ANNUAL_PRODUCT_ID =
  process.env.POLAR_ENTERPRISE_ANNUAL_PRODUCT_ID || "";

export const TIER_FEATURE_LIMITS = {
  free: { scans: 100, users: 1, agents: 1, orgs: 1 },
  pro: { scans: -1, users: 5, agents: 3, orgs: 1 },
  enterprise: { scans: -1, users: -1, agents: -1, orgs: -1 },
} as const;

export type BillingTier = keyof typeof TIER_FEATURE_LIMITS;

export function normalizeBillingTier(
  rawTier: string | null | undefined,
): BillingTier {
  const normalized = (rawTier || "free").toLowerCase();

  if (normalized === "enterprise" || normalized === "command_control") {
    return "enterprise";
  }

  if (normalized === "pro" || normalized === "soc_pro") {
    return "pro";
  }

  return "free";
}

export function productIdToTier(productId: string): BillingTier {
  if (
    productId === POLAR_PRO_MONTHLY_PRODUCT_ID ||
    productId === POLAR_PRO_ANNUAL_PRODUCT_ID
  ) {
    return "pro";
  }

  if (
    productId === POLAR_ENTERPRISE_MONTHLY_PRODUCT_ID ||
    productId === POLAR_ENTERPRISE_ANNUAL_PRODUCT_ID
  ) {
    return "enterprise";
  }

  return "free";
}
