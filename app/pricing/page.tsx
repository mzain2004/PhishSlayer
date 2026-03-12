"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createStripePortalSession } from "@/lib/supabase/actions";

const tiers = [
  {
    name: "Community",
    id: "free",
    monthlyPrice: 0,
    annualPrice: 0,
    desc: "For security researchers and lone hunters",
    popular: false,
    features: [
      { text: "Core Scan Engine", ok: true },
      { text: "WHOIS & DNS Analysis", ok: true },
      { text: "Intel Vault (Public)", ok: true },
      { text: "AI Threat Narrator", ok: false },
      { text: "Fleet Agents (25)", ok: false },
      { text: "Offline Fallback", ok: false },
    ],
  },
  {
    name: "Fleet Command",
    id: "pro", 
    monthlyPrice: 99,
    annualPrice: 79,
    desc: "For SOC professionals managing small fleets",
    popular: true,
    stripePriceIdMonth: process.env.NEXT_PUBLIC_STRIPE_PRICE_FLEET || "mock_fleet_monthly",
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_FLEET_ANNUAL || "mock_fleet_annual",
    features: [
      { text: "Core Scan Engine", ok: true },
      { text: "WHOIS & DNS Analysis", ok: true },
      { text: "Intel Vault (Private)", ok: true },
      { text: "AI Threat Narrator", ok: true },
      { text: "Fleet Agents (250)", ok: true },
      { text: "Offline Fallback", ok: false },
    ],
  },
  {
    name: "Enterprise Edge",
    id: "enterprise",
    monthlyPrice: 299,
    annualPrice: 239,
    desc: "For global SOC operations and MSSPs",
    popular: false,
    stripePriceIdMonth: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "mock_enterprise_monthly",
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || "mock_enterprise_annual",
    features: [
      { text: "Core Scan Engine", ok: true },
      { text: "WHOIS & DNS Analysis", ok: true },
      { text: "Intel Vault (Global)", ok: true },
      { text: "AI Threat Narrator", ok: true },
      { text: "Fleet Agents (Unlimited)", ok: true },
      { text: "Offline Fallback", ok: true },
    ],
  },
];

const faqs = [
  {
    q: "Can I change plans anytime?",
    a: "Yes! Upgrades take effect instantly. Downgrades apply at your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — paid plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. SOC2 ready, Row Level Security enforced on all data, encrypted at rest and in transit.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [userTier, setUserTier] = useState<string>("free");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.subscription_tier) {
              setUserTier(profile.subscription_tier.toLowerCase());
            }
            setLoadingConfig(false);
          });
      } else {
        setLoadingConfig(false);
      }
    });
  }, []);

  const handleCheckout = async (plan: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingPeriod: billing }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503 || data.error === 'stripe_not_configured') {
          toast.info("Payments coming soon! Sign up to be notified.");
          if (!isLoggedIn) window.location.href = `/auth/signup?plan=${plan}`;
          return;
        }
        throw new Error(data.error || "Checkout failed");
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    }
  };

  const handleManagePlan = async () => {
    const res = await createStripePortalSession();
    if (res?.url) window.location.href = res.url;
    else if (res?.error) toast.error("Payments coming soon!");
  };

  const getButtonConfig = (t: typeof tiers[0]) => {
    if (!isLoggedIn) {
      return {
        text: "Get Started",
        action: () => { window.location.href = t.id === "free" ? "/auth/signup" : `/auth/signup?plan=${t.id}`; },
        disabled: false,
      };
    }
    
    const tierOrder: Record<string, number> = { 'free': 0, 'community': 0, 'pro': 1, 'fleet command': 1, 'enterprise': 2, 'enterprise edge': 2 };
    const currentOrder = tierOrder[userTier] ?? 0;
    const thisOrder = tierOrder[t.id] ?? 0;

    if (currentOrder === thisOrder) return { text: "Current Plan", action: () => {}, disabled: true };
    if (thisOrder > currentOrder) return { text: "Upgrade →", action: () => currentOrder === 0 ? handleCheckout(t.id) : handleManagePlan(), disabled: false };
    return { text: "Switch Plan", action: handleManagePlan, disabled: false };
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans selection:bg-teal-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-md border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-[#e6edf3] font-bold text-xl tracking-tight">
            <Shield className="w-6 h-6 text-teal-400" /> Phish-Slayer
          </Link>
          <div className="flex items-center gap-6">
            {!loadingConfig && (
              isLoggedIn ? (
                <Link href="/dashboard" className="bg-teal-500 hover:bg-teal-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                  Command Center →
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="text-[#8b949e] hover:text-[#e6edf3] text-sm font-medium transition-colors">Login</Link>
                  <Link href="/auth/signup" className="bg-teal-500 hover:bg-teal-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">Start Free</Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="max-w-7xl mx-auto px-8 pt-20 pb-16 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-teal-400 font-semibold mb-8 transition-colors group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> BACK TO BASE
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-[#e6edf3] tracking-tight mb-4">
          Scalable Threat Intelligence
        </h1>
        <p className="text-[#8b949e] max-w-xl mx-auto text-lg mb-10">
          From independent researchers to global SOC teams, choose the tier that matches your security perimeter.
        </p>

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="bg-[#161b22] border border-[#30363d] p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${billing === "monthly" ? "bg-[#1c2128] text-[#e6edf3] shadow-sm" : "text-[#6e7681] hover:text-[#e6edf3]"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === "annual" ? "bg-[#1c2128] text-[#e6edf3] shadow-sm" : "text-[#6e7681] hover:text-[#e6edf3]"}`}
            >
              Annual
              <span className="text-[10px] bg-green-500/10 text-[#3fb950] border border-[#3fb950]/20 px-1.5 py-0.5 rounded uppercase">Save 20%</span>
            </button>
          </div>
        </div>
      </header>

      {/* Pricing Grid */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {tiers.map((t, i) => {
            const price = billing === "annual" ? t.annualPrice : t.monthlyPrice;
            const btn = getButtonConfig(t);
            
            return (
              <div key={i} className={`bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col transition-all duration-300 ${t.popular ? 'ring-2 ring-teal-500/50 shadow-2xl shadow-teal-500/10 scale-105 z-10' : 'hover:bg-[#1c2128]'}`}>
                {t.popular && <div className="text-center mb-6"><span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">RECOMMENDED</span></div>}
                
                <h3 className="text-xl font-bold text-[#e6edf3] mb-2">{t.name}</h3>
                <p className="text-[#8b949e] text-sm leading-relaxed mb-8">{t.desc}</p>
                
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[#e6edf3]">${price}</span>
                    <span className="text-[#8b949e] text-sm">/month</span>
                  </div>
                  {billing === "annual" && price > 0 && <p className="text-xs text-[#6e7681] mt-1 line-through">${t.monthlyPrice} if billed monthly</p>}
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {t.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {f.ok ? <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" /> : <X className="w-4 h-4 text-[#30363d] mt-0.5 shrink-0" />}
                      <span className={`text-sm ${f.ok ? 'text-[#e6edf3]' : 'text-[#6e7681]'}`}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={btn.action}
                  disabled={btn.disabled || loadingConfig}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${btn.disabled ? 'bg-[#21262d] text-[#6e7681] cursor-not-allowed' : t.popular ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20' : 'bg-[#1c2128] border border-[#30363d] text-[#e6edf3] hover:bg-[#21262d]'}`}
                >
                  {loadingConfig ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : btn.text}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#161b22]/50 border-t border-[#30363d] py-24">
        <div className="max-w-3xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Deployment Intelligence</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                <h4 className="text-[#e6edf3] font-semibold mb-2">{f.q}</h4>
                <p className="text-[#8b949e] text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-[#30363d] text-center text-xs text-[#6e7681]">
        © 2026 Phish-Slayer Platform. All rights reserved.
      </footer>
    </div>
  );
}
