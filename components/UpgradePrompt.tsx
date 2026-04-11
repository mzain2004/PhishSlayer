"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

type BillingTier = "free" | "pro" | "enterprise";

type UpgradePromptProps = {
  requiredTier: Exclude<BillingTier, "free">;
  feature: string;
  className?: string;
};

function rank(tier: BillingTier) {
  if (tier === "enterprise") return 3;
  if (tier === "pro") return 2;
  return 1;
}

export default function UpgradePrompt({
  requiredTier,
  feature,
  className = "",
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<BillingTier>("free");

  useEffect(() => {
    async function loadTier() {
      try {
        const response = await fetch("/api/billing/subscription", {
          cache: "no-store",
        });

        if (response.ok) {
          const payload = (await response.json()) as { tier?: BillingTier };
          if (payload.tier) {
            setTier(payload.tier);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    void loadTier();
  }, []);

  if (loading) {
    return (
      <div
        className={`mb-4 flex items-center gap-2 text-sm text-white/70 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking plan access...
      </div>
    );
  }

  if (rank(tier) >= rank(requiredTier)) {
    return null;
  }

  return (
    <div
      className={`mb-6 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-amber-100 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <Lock className="mr-2 inline h-4 w-4" />
          {feature} requires the {requiredTier.toUpperCase()} plan.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-200"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
