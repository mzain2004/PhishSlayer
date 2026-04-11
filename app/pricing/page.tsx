"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

type BillingCycle = "monthly" | "annual";
type TierId = "free" | "pro" | "enterprise";

type TierCard = {
  id: TierId;
  name: string;
  monthly: number;
  annualMonthlyEquivalent: number;
  description: string;
  productId: (cycle: BillingCycle) => string;
  features: string[];
  cta: string;
  popular?: boolean;
};

const TIERS: TierCard[] = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annualMonthlyEquivalent: 0,
    description: "For individual analysts and early testing.",
    productId: () => "",
    cta: "Start Free",
    features: [
      "100 URL scans / month",
      "1 analyst seat",
      "1 endpoint agent",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 49,
    annualMonthlyEquivalent: 39,
    description: "For active SOC teams with daily detection workflows.",
    productId: (cycle) =>
      cycle === "annual"
        ? process.env.NEXT_PUBLIC_POLAR_PRO_ANNUAL_PRODUCT_ID || ""
        : process.env.NEXT_PUBLIC_POLAR_PRO_MONTHLY_PRODUCT_ID || "",
    cta: "Upgrade to Pro",
    popular: true,
    features: [
      "Unlimited scans",
      "5 analyst seats",
      "3 endpoint agents",
      "Static analysis + Sigma generation",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 299,
    annualMonthlyEquivalent: 249,
    description: "For MSSPs and large incident response teams.",
    productId: (cycle) =>
      cycle === "annual"
        ? process.env.NEXT_PUBLIC_POLAR_ENTERPRISE_ANNUAL_PRODUCT_ID || ""
        : process.env.NEXT_PUBLIC_POLAR_ENTERPRISE_MONTHLY_PRODUCT_ID || "",
    cta: "Upgrade to Enterprise",
    features: [
      "Unlimited everything",
      "Unlimited analyst seats",
      "Unlimited endpoint agents",
      "Multi-org support",
      "Dedicated success channel",
    ],
  },
];

function fmtPrice(value: number) {
  if (value === 0) return "$0";
  return `$${value}`;
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingTier, setLoadingTier] = useState<TierId | null>(null);

  const plans = useMemo(() => {
    return TIERS.map((tier) => {
      const monthlyDisplay =
        cycle === "annual" ? tier.annualMonthlyEquivalent : tier.monthly;
      const billedYearly = cycle === "annual" && tier.monthly > 0;
      return { tier, monthlyDisplay, billedYearly };
    });
  }, [cycle]);

  async function startCheckout(tier: TierCard) {
    if (tier.id === "free") {
      window.location.href = "/auth/signup";
      return;
    }

    const productId = tier.productId(cycle);
    if (!productId) {
      toast.error("Pricing is not configured for this plan yet.");
      return;
    }

    setLoadingTier(tier.id);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/dashboard/billing?upgraded=true`,
        }),
      });

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Failed to create checkout session");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout",
      );
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_15%_-10%,rgba(34,197,94,0.20),transparent),radial-gradient(900px_380px_at_85%_0%,rgba(45,212,191,0.18),transparent),#060b11] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
          >
            <Shield className="h-4 w-4 text-teal-300" />
            Phish Slayer
          </Link>
        </div>

        <div className="mb-12 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Security billing built for fast incident response
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Start free, scale to pro, and unlock enterprise control as your SOC grows.
          </p>
        </div>

        <div className="mb-10 inline-flex items-center rounded-full border border-white/15 bg-white/5 p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              cycle === "monthly"
                ? "bg-teal-400 text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              cycle === "annual"
                ? "bg-teal-400 text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            Annual
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map(({ tier, monthlyDisplay, billedYearly }) => (
            <article
              key={tier.id}
              className={`relative rounded-2xl border p-6 ${
                tier.popular
                  ? "border-teal-300/70 bg-teal-300/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {tier.popular ? (
                <span className="absolute -top-3 right-6 rounded-full bg-teal-300 px-3 py-1 text-xs font-bold text-black">
                  Most Popular
                </span>
              ) : null}

              <h2 className="text-2xl font-semibold">{tier.name}</h2>
              <p className="mt-2 text-sm text-white/70">{tier.description}</p>

              <div className="mt-5">
                <span className="text-4xl font-bold">{fmtPrice(monthlyDisplay)}</span>
                <span className="ml-2 text-white/70">/ month</span>
                {billedYearly ? (
                  <p className="mt-1 text-xs text-teal-200">
                    Billed annually ({fmtPrice(monthlyDisplay * 12)}/year)
                  </p>
                ) : null}
              </div>

              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/90">
                    <Check className="h-4 w-4 text-teal-300" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => void startCheckout(tier)}
                disabled={loadingTier === tier.id}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingTier === tier.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {tier.cta}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
