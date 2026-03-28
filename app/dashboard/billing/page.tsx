"use client";

import { useState, useEffect } from "react";
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

const TIER_DISPLAY: Record<string, { name: string; tagline: string; amount: string }> = {
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
  const [billingCustomerId, setBillingCustomerId] = useState<string | null>(null);
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

  const handleManageSubscription = async () => {
    if (!isPaid) {
      toast.info("No active subscription", {
        description: "Visit the pricing page to subscribe to a plan.",
      });
      return;
    }

    setIsPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal');
      const data = await res.json();

      if (res.status === 400 && data?.redirect) {
        router.push(data.redirect);
        return;
      }
      
      if (res.status === 404) {
        toast.error("No active billing profile found", {
          description: "Please complete a checkout first to manage your subscription.",
        });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to get portal URL');
      }
    } catch (error: any) {
      console.error('Portal Error:', error);
      toast.error(error.message || "Failed to open billing portal. Please contact support.");
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
    <div className="px-8 py-6 space-y-8 max-w-7xl mx-auto w-full">
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
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        {isPaid && (
          <div className="h-px w-full bg-gradient-to-r from-teal-500/60 via-teal-500/20 to-transparent mb-6 -mt-6 -mx-6 px-0 rounded-t-2xl" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-5 h-5 text-teal-400" />
              <h2 className="text-[#e6edf3] text-xl font-semibold">{plan.name} Plan</h2>
              <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                ACTIVE
              </span>
            </div>
            <p className="text-[#8b949e] text-sm">{plan.tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            {isPaid ? (
              <button
                disabled={isPortalLoading}
                onClick={handleManageSubscription}
                className="flex items-center gap-2 px-4 py-2 bg-[#1c2128] border border-[#30363d] text-[#e6edf3] hover:bg-[#21262d] text-sm font-medium rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
              >
                {isPortalLoading ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <CreditCard className="w-4 h-4" />}
                Manage Subscription
              </button>
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

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 border-t border-[#30363d] pt-6 gap-6">
          <div>
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">Current Tier</p>
            <p className="text-[#e6edf3] text-sm font-semibold">{plan.name}</p>
          </div>
          <div className="md:border-l border-[#30363d] md:pl-6">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">Billing</p>
            <p className="text-[#e6edf3] text-sm font-semibold">
              {isPaid ? "Monthly via Paddle" : "Free"}
            </p>
          </div>
          <div className="md:border-l border-[#30363d] md:pl-6">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">Monthly Amount</p>
            <p className="text-[#e6edf3] text-sm font-semibold">{plan.amount}/mo</p>
          </div>
        </div>
      </div>

      {!billingCustomerId && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6">
          <h3 className="text-[#E6EDF3] text-lg font-semibold">No Active Subscription</h3>
          <p className="text-[#8B949E] text-sm mt-2 mb-4">
            You are currently on the free Recon plan.
          </p>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-[#2DD4BF] text-white border-none rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Upgrade Your Plan
          </button>
        </div>
      )}

      {/* Usage Section */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h3 className="text-[#e6edf3] text-sm font-semibold mb-6">Plan Limits</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">Daily Scans</span>
              <span className="text-[#e6edf3]">
                {activePlan === "command_control" ? "Unlimited" : activePlan === "soc_pro" ? "500/day" : "10/day"}
              </span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-teal-400 h-full rounded-full"
                style={{ width: isPaid ? "100%" : "30%" }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">Fleet Agent Slots</span>
              <span className="text-[#e6edf3]">
                {activePlan === "command_control" ? "Unlimited" : activePlan === "soc_pro" ? "10" : "1"}
              </span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full"
                style={{ width: isPaid ? "100%" : "10%" }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">API Access</span>
              <span className="text-[#e6edf3]">
                {activePlan === "command_control" ? "Unlimited" : activePlan === "soc_pro" ? "1,000/day" : "Locked"}
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
      </div>

      {/* Invoice History */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="bg-[#1c2128] border-b border-[#30363d] px-5 py-3">
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
              <tr className="border-b border-[#30363d] text-[#6e7681] text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {!isPaid ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[#6e7681] text-sm">
                    No billing history available on the Recon plan.
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[#6e7681] text-sm">
                    Invoice history is managed by Paddle. Check your email for receipts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
