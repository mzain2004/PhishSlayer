"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createStripePortalSession } from "@/lib/supabase/actions";

export default function BillingPage() {
  const [activePlan, setActivePlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [manageLoading, setManageLoading] = useState(false);

  const handleManagePayment = async () => {
    setManageLoading(true);
    const result = await createStripePortalSession();

    if (result.error === "stripe_not_configured") {
      toast.info("Payment management coming soon", {
        description:
          "Stripe integration will be available shortly. Contact support@phishslayer.tech for billing inquiries.",
      });
    } else if (result.error) {
      toast.error("Error", { description: result.error });
    } else if (result.url) {
      window.location.href = result.url;
    }
    setManageLoading(false);
  };

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", userData.user.id)
          .single();
        if (profile?.subscription_tier) {
          setActivePlan(profile.subscription_tier.toLowerCase());
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const getPlanDetails = () => {
    if (activePlan === "enterprise") {
      return {
        name: "Enterprise",
        tagline: "For SOC teams managing an organization",
        amount: "$299",
        scans: { used: "Unlimited", total: "Unlimited", percent: 100 },
        api: { used: "Unlimited", total: "Unlimited", percent: 100 },
        team: { used: 1, total: "Unlimited", percent: 100 },
      };
    } else if (activePlan === "pro") {
      return {
        name: "Pro",
        tagline: "For SOC analysts who need deeper analysis",
        amount: "$99",
        scans: { used: "Unlimited", total: "Unlimited", percent: 100 },
        api: { used: "1,240", total: "5,000", percent: 25 },
        team: { used: 1, total: "5", percent: 20 },
      };
    } else {
      return {
        name: "Community",
        tagline: "For individuals exploring threat intelligence",
        amount: "$0",
        scans: { used: 3, total: 10, percent: 30 },
        api: { used: 0, total: 0, percent: 0 },
        team: { used: 1, total: 1, percent: 100 },
      };
    }
  };

  const plan = getPlanDetails();

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
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 relative overflow-hidden">
        {activePlan === "enterprise" && (
           <div className="h-px w-full bg-gradient-to-r from-teal-500/60 via-teal-500/20 to-transparent mb-6 -mt-6 -mx-6 px-0 rounded-t-xl" />
        )}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[#e6edf3] text-xl font-semibold">{plan.name} Plan</h2>
              <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                ACTIVE
              </span>
            </div>
            <p className="text-[#8b949e] text-sm">{plan.tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgrade
            </Link>
            <button
              onClick={handleManagePayment}
              disabled={manageLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1c2128] border border-[#30363d] text-[#e6edf3] hover:bg-[#21262d] text-sm font-medium rounded-lg transition-colors"
            >
              {manageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Manage Payment
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 border-t border-[#30363d] pt-6 gap-6">
          <div>
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">Billing Period</p>
            <p className="text-[#e6edf3] text-sm font-semibold">Monthly</p>
          </div>
          <div className="md:border-l border-[#30363d] md:pl-6">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">Next Payment</p>
            <p className="text-[#e6edf3] text-sm font-semibold">
              {activePlan === "free" ? "N/A" : "Nov 24, 2026"}
            </p>
          </div>
          <div className="md:border-l border-[#30363d] md:pl-6">
            <p className="text-[#6e7681] text-xs uppercase tracking-wider mb-1">Monthly Amount</p>
            <p className="text-[#e6edf3] text-sm font-semibold">{plan.amount}/mo</p>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h3 className="text-[#e6edf3] text-sm font-semibold mb-6">Usage This Month</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">Monthly Scans</span>
              <span className="text-[#e6edf3]">{plan.scans.used} / {plan.scans.total}</span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-teal-400 h-full rounded-full"
                style={{ width: `${plan.scans.percent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">API Requests</span>
              <span className="text-[#e6edf3]">{plan.api.used} / {plan.api.total}</span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full"
                style={{ width: `${plan.api.percent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-[#8b949e]">Team Members</span>
              <span className="text-[#e6edf3]">{plan.team.used} / {plan.team.total}</span>
            </div>
            <div className="bg-[#21262d] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#3fb950] h-full rounded-full"
                style={{ width: `${plan.team.percent}%` }}
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
              {activePlan === "free" ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[#6e7681] text-sm">
                    No billing history available on the Community plan.
                  </td>
                </tr>
              ) : (
                <tr className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors group">
                  <td className="px-5 py-4 text-[#e6edf3]">Oct 24, 2026</td>
                  <td className="px-5 py-4 text-[#e6edf3] font-mono">{plan.amount}.00</td>
                  <td className="px-5 py-4">
                    <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                      PAID
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button 
                      onClick={() => toast.info("Invoice download coming soon")}
                      className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
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
