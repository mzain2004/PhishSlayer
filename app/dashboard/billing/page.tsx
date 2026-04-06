"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CreditCard,
  FileText,
  Loader2,
  ExternalLink,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const TIER_DISPLAY: Record<
  string,
  { name: string; tagline: string; amount: string }
> = {
  recon: {
    name: "Recon",
    tagline: "For individuals exploring threat intelligence",
    amount: "$0",
  },
  free: {
    name: "Recon",
    tagline: "For individuals exploring threat intelligence",
    amount: "$0",
  },
  soc_pro: {
    name: "SOC Pro",
    tagline: "For SOC professionals managing small fleets",
    amount: "$49",
  },
  command_control: {
    name: "Command & Control",
    tagline: "For global SOC operations and MSSPs",
    amount: "$299",
  },
};

export default function BillingPage() {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState("recon");
  const [billingCustomerId, setBillingCustomerId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_tier, billing_customer_id")
          .eq("id", userData.user.id)
          .single();
        if (profile?.subscription_tier) {
          setActivePlan(profile.subscription_tier.toLowerCase());
        }
        if (profile?.billing_customer_id) {
          setBillingCustomerId(profile.billing_customer_id);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const plan = TIER_DISPLAY[activePlan] || TIER_DISPLAY.recon;
  const isPaid = activePlan !== "recon" && activePlan !== "free";

  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const cardHover = {
    whileHover: {
      y: -3,
      boxShadow: "0 18px 36px rgba(15, 23, 42, 0.42)",
    },
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  };

  const handleManageSubscription = async () => {
    if (!isPaid) {
      toast.info("No active subscription", {
        description: "Visit the pricing page to subscribe to a plan.",
      });
      return;
    }

    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json();

      if (res.status === 400 && data?.redirect) {
        router.push(data.redirect);
        return;
      }

      if (res.status === 404) {
        toast.error("No active billing profile found", {
          description:
            "Please complete a checkout first to manage your subscription.",
        });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to get portal URL");
      }
    } catch (error: any) {
      console.error("Portal Error:", error);
      toast.error(
        error.message ||
          "Failed to open billing portal. Please contact support.",
      );
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-[#e6edf3] text-2xl font-semibold tracking-tight">
          Billing & Subscription
        </h1>
        <p className="text-[#8b949e] text-sm mt-0.5">
          Manage your plan, usage, and invoices
        </p>
      </div>

      {/* Plan Card */}
      <motion.div
        {...cardHover}
        className="bg-[rgba(15,23,42,0.62)] backdrop-blur-md border border-[rgba(45,212,191,0.18)] rounded-2xl p-5 relative overflow-hidden"
      >
        {isPaid && (
          <div className="h-px w-full bg-gradient-to-r from-teal-500/60 via-teal-500/20 to-transparent mb-6 -mt-6 -mx-6 px-0 rounded-t-2xl" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-5 h-5 text-teal-400" />
              <h2 className="text-[#e6edf3] text-xl font-semibold">
                {plan.name} Plan
              </h2>
              <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                ACTIVE
              </span>
            </div>
            <p className="text-[#8b949e] text-sm">{plan.tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            {isPaid ? (
              <motion.button
                disabled={isPortalLoading}
                onClick={handleManageSubscription}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-5 py-2 text-sm font-semibold text-white [transition:all_0.2s_ease] disabled:opacity-50"
              >
                {isPortalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Manage Subscription
              </motion.button>
            ) : (
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 border-t border-white/10 pt-4 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">
              Current Tier
            </p>
            <p className="text-[#e6edf3] text-sm font-semibold">{plan.name}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">
              Billing
            </p>
            <p className="text-[#e6edf3] text-sm font-semibold">
              {isPaid ? "Monthly via Paddle" : "Free"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">
              Monthly Amount
            </p>
            <p className="text-[#e6edf3] text-sm font-semibold">
              {plan.amount}/mo
            </p>
          </div>
        </div>
      </motion.div>

      {!billingCustomerId && (
        <motion.div {...cardHover} className="liquid-glass rounded-2xl p-5">
          <h3 className="text-[#E6EDF3] text-lg font-semibold">
            No Active Subscription
          </h3>
          <p className="text-[#8B949E] text-sm mt-2 mb-4">
            You are currently on the free Recon plan.
          </p>
          <motion.button
            onClick={() => router.push("/pricing")}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 0 20px rgba(45,212,191,0.4)",
            }}
            whileTap={{ scale: 0.96 }}
            className="rounded-full px-5 py-2 text-sm font-semibold text-black [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)]"
          >
            Upgrade Your Plan
          </motion.button>
        </motion.div>
      )}

      {/* Usage Section */}
      <motion.div {...cardHover} className="liquid-glass rounded-xl p-5">
        <h3 className="text-[#e6edf3] text-sm font-semibold mb-6">
          Plan Limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">Daily Scans</span>
              <span className="text-[#e6edf3]">
                {activePlan === "command_control"
                  ? "Unlimited"
                  : activePlan === "soc_pro"
                    ? "500/day"
                    : "10/day"}
              </span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-teal-400 h-full rounded-full"
                style={{ width: isPaid ? "100%" : "30%" }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">Fleet Agent Slots</span>
              <span className="text-[#e6edf3]">
                {activePlan === "command_control"
                  ? "Unlimited"
                  : activePlan === "soc_pro"
                    ? "10"
                    : "1"}
              </span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full"
                style={{ width: isPaid ? "100%" : "10%" }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">API Access</span>
              <span className="text-[#e6edf3]">
                {activePlan === "command_control"
                  ? "Unlimited"
                  : activePlan === "soc_pro"
                    ? "1,000/day"
                    : "Locked"}
              </span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#3fb950] h-full rounded-full"
                style={{ width: isPaid ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Invoice History */}
      <motion.div
        {...cardHover}
        className="liquid-glass rounded-xl overflow-hidden"
      >
        <div className="bg-[#1c2128] border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6e7681]" />
            <span className="text-[#6e7681] text-xs uppercase tracking-wider font-semibold">
              Invoice History
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[#6e7681] text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {!isPaid ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-[#6e7681] text-sm"
                  >
                    No billing history available on the Recon plan.
                  </td>
                </tr>
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-[#6e7681] text-sm"
                  >
                    Invoice history is managed by Paddle. Check your email for
                    receipts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
