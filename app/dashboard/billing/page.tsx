"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  FileText,
  BarChart2,
  Download,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function BillingPage() {
  const [activePlan, setActivePlan] = useState("free");
  const [loading, setLoading] = useState(true);

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
        period: "Monthly",
        scans: { used: "Unlimited", total: "Unlimited", percent: 100 },
        api: { used: "Unlimited", total: "Unlimited", percent: 100 },
        team: { used: 1, total: "Unlimited", percent: 100 },
        nextTier: null,
      };
    } else if (activePlan === "pro") {
      return {
        name: "Pro",
        tagline: "For SOC analysts who need deeper analysis",
        amount: "$99",
        period: "Monthly",
        scans: { used: "Unlimited", total: "Unlimited", percent: 100 },
        api: { used: "1,240", total: "5,000", percent: 25 },
        team: { used: 1, total: "5", percent: 20 },
        nextTier: "Enterprise",
      };
    } else {
      return {
        name: "Free",
        tagline: "For individuals exploring threat intelligence",
        amount: "$0",
        period: "Monthly",
        scans: { used: 3, total: 10, percent: 30 },
        api: { used: 0, total: 0, percent: 0 },
        team: { used: 1, total: 1, percent: 100 },
        nextTier: "Pro",
      };
    }
  };

  const plan = getPlanDetails();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-teal-500/30 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full font-sans pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-teal-400" />
          Billing & Subscription
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Manage your plan, payment method, and invoices
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Plan & Features */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          {/* Current Plan Card */}
          <div className="bg-[#0f1629] border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">
                    {plan.name} Plan
                  </h2>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    Active
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{plan.tagline}</p>

                <div className="mt-8 flex flex-col md:flex-row md:items-center gap-8">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Billing Period
                    </p>
                    <p className="text-white font-semibold">{plan.period}</p>
                  </div>
                  <div className="hidden md:block w-px h-10 bg-slate-800" />
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Next Billing Date
                    </p>
                    <p className="text-white font-semibold">
                      {activePlan === "free"
                        ? "No active subscription"
                        : "Nov 24, 2026"}
                    </p>
                  </div>
                  <div className="hidden md:block w-px h-10 bg-slate-800" />
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Amount Due
                    </p>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {plan.amount}
                      <span className="text-sm font-normal text-slate-400">
                        /mo
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-4 relative z-10">
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg transition-colors text-center"
              >
                Upgrade Plan
              </Link>
              <button
                onClick={() => toast.info("Payment management coming soon")}
                className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold rounded-lg transition-colors"
              >
                Manage Payment
              </button>
            </div>
          </div>

          {/* Usage This Month Card */}
          <div className="bg-[#0f1629] border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="w-5 h-5 text-teal-400" />
              <h3 className="text-lg font-bold text-white">Usage This Month</h3>
            </div>

            <div className="space-y-6">
              {/* Scans */}
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-slate-400">Monthly Scans</span>
                  <span className="text-white">
                    {plan.scans.used} / {plan.scans.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${plan.scans.percent}%` }}
                  />
                </div>
              </div>

              {/* API Calls */}
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-slate-400">API Requests</span>
                  <span className="text-white">
                    {plan.api.used} / {plan.api.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${plan.api.percent}%` }}
                  />
                </div>
              </div>

              {/* Team Members */}
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-slate-400">Team Members</span>
                  <span className="text-white">
                    {plan.team.used} / {plan.team.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${plan.team.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice History Card */}
          <div className="bg-[#0f1629] border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="text-lg font-bold text-white">
                  Invoice History
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {activePlan === "free" ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        No invoices yet. Invoices will appear here after your
                        first payment.
                      </td>
                    </tr>
                  ) : (
                    <tr className="group hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 text-slate-300">Oct 24, 2026</td>
                      <td className="py-4 text-white font-medium">
                        Phish-Slayer {plan.name} Plan
                      </td>
                      <td className="py-4 text-slate-300 font-mono">
                        {plan.amount}.00
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Paid
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() =>
                            toast.info("Invoice download coming soon")
                          }
                          className="p-2 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors inline-block"
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

        {/* Right Column: Features & Upgrade */}
        <div className="flex flex-col gap-8">
          {/* Upgrade CTA */}
          {plan.nextTier && (
            <div className="bg-gradient-to-br from-[#0f1629] to-[#0a0f1e] border-2 border-teal-500/50 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-teal-500/5 group-hover:bg-teal-500/10 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Unlock the full power of Phish-Slayer
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Upgrade to {plan.nextTier} array of enterprise security tools
                  and limitless scanning capabilities.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Advanced AI Heuristics
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Unlimited threat analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Priority support
                  </li>
                </ul>
                <Link
                  href="/pricing"
                  className="block w-full text-center px-4 py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg transition-colors shadow-lg shadow-teal-500/20"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}

          {/* Plan Features */}
          <div className="bg-[#0f1629] border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-teal-400" />
              <h3 className="text-lg font-bold text-white">
                Your Plan Features
              </h3>
            </div>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                <span>
                  {plan.scans.total === "Unlimited"
                    ? "Unlimited scans"
                    : "10 scans per day"}
                </span>
              </li>
              {activePlan !== "free" && (
                <>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <span>AI Heuristics Engine (Gemini)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <span>Port Patrol (Active Recon)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <span>SIEM Integration (STIX 2.1)</span>
                  </li>
                </>
              )}
              {activePlan === "free" && (
                <>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <span>3-gate threat pipeline</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <span>Basic WHOIS lookup</span>
                  </li>
                </>
              )}
            </ul>
            <Link
              href="/pricing"
              className="text-sm font-semibold text-teal-400 hover:text-teal-300"
            >
              Unlock more features &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
