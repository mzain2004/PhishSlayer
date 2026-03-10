"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Check, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const tiers = [
  {
    name: "FREE",
    monthlyPrice: 0,
    annualPrice: 0,
    desc: "For security researchers and individuals",
    cta: "Get Started Free",
    href: "/auth/signup",
    popular: false,
    features: [
      { text: "10 scans per day", ok: true },
      { text: "3-gate threat pipeline", ok: true },
      { text: "VirusTotal integration", ok: true },
      { text: "Email threat alerts", ok: true },
      { text: "Basic WHOIS lookup", ok: true },
      { text: "7-day scan history", ok: true },
      { text: "1 user account", ok: true },
      { text: "AI Heuristics Engine", ok: false },
      { text: "Port Patrol", ok: false },
      { text: "Deep Scan Suite", ok: false },
      { text: "SIEM Integration", ok: false },
      { text: "API access", ok: false },
      { text: "Team management", ok: false },
    ],
  },
  {
    name: "PRO",
    monthlyPrice: 99,
    annualPrice: 79,
    desc: "For SOC analysts and security professionals",
    cta: "Start 14-Day Free Trial",
    href: "/auth/signup?plan=pro",
    popular: false,
    features: [
      { text: "Unlimited scans", ok: true },
      { text: "AI Heuristics Engine (Gemini)", ok: true },
      { text: "Port Patrol (Active Recon)", ok: true },
      { text: "Deep Scan Suite (8 analysis tabs)", ok: true },
      { text: "SIEM Integration (STIX 2.1)", ok: true },
      { text: "Discord + Email alerts", ok: true },
      { text: "Takedown Generator", ok: true },
      { text: "PDF Executive Reports", ok: true },
      { text: "API access (5,000 calls/month)", ok: true },
      { text: "5 team members", ok: true },
      { text: "90-day scan history", ok: true },
      { text: "Priority email support", ok: true },
      { text: "Full RBAC management", ok: false },
      { text: "Audit logging", ok: false },
      { text: "User Management portal", ok: false },
      { text: "Unlimited team members", ok: false },
    ],
  },
  {
    name: "ENTERPRISE",
    monthlyPrice: 299,
    annualPrice: 239,
    desc: "For SOC teams and security operations centers",
    cta: "Start 14-Day Free Trial",
    href: "/auth/signup?plan=enterprise",
    popular: true,
    features: [
      { text: "Everything in Pro", ok: true },
      { text: "Full RBAC (4 role tiers)", ok: true },
      { text: "Audit logging & compliance", ok: true },
      { text: "User Management portal", ok: true },
      { text: "Unlimited team members", ok: true },
      { text: "Unlimited scan history", ok: true },
      { text: "API access (unlimited)", ok: true },
      { text: "Custom Intel Vault", ok: true },
      { text: "Webhook integrations", ok: true },
      { text: "Weekly threat digest emails", ok: true },
      { text: "Dedicated account manager", ok: true },
      { text: "SLA guarantee (99.9% uptime)", ok: true },
      { text: "Custom onboarding", ok: true },
    ],
  },
  {
    name: "CUSTOM",
    monthlyPrice: -1,
    annualPrice: -1,
    desc: "For large enterprises with specific requirements",
    cta: "Contact Sales",
    href: "mailto:sales@phishslayer.tech",
    popular: false,
    features: [
      { text: "Everything in Enterprise", ok: true },
      { text: "On-premise deployment option", ok: true },
      { text: "Custom scan rate limits", ok: true },
      { text: "Custom data retention", ok: true },
      { text: "SSO/SAML integration", ok: true },
      { text: "Security audit assistance", ok: true },
      { text: "Custom SLA terms", ok: true },
      { text: "Dedicated engineering support", ok: true },
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
    a: "Yes — Pro and Enterprise both include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards via Stripe. Invoicing is available for Enterprise and Custom plans.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — we offer a 30-day money-back guarantee on all paid plans. No questions asked.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. SOC2 ready, Row Level Security enforced on all data, encrypted at rest and in transit. Your threat data is yours alone.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const handleCheckout = async (plan: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          billingPeriod: billing,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) {
          toast.info("Payments coming soon! Sign up for the waitlist.");
          window.location.href = `/auth/signup?plan=${plan}`;
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

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-black text-xl"
          >
            <Shield className="w-6 h-6 text-teal-500" />
            Phish-Slayer
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 bg-teal-500 text-white text-sm font-bold rounded-lg hover:bg-teal-400 transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="text-center py-20 px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-teal-500 hover:text-teal-400 font-semibold mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight text-center">
          Pricing that scales with your team
        </h1>
        <p className="text-slate-400 mt-4 text-lg max-w-lg mx-auto text-center">
          Start free. Upgrade when you&apos;re ready.
        </p>

        {/* Toggle */}
        <div className="flex justify-center mt-8">
          <div className="inline-flex bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={
                billing === "monthly"
                  ? "bg-teal-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all"
                  : "text-slate-400 px-6 py-2 rounded-lg text-sm font-medium hover:text-white transition-all"
              }
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={
                billing === "annual"
                  ? "bg-teal-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all"
                  : "text-slate-400 px-6 py-2 rounded-lg text-sm font-medium hover:text-white transition-all"
              }
            >
              Annual
              <span className="ml-2 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Pricing cards */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((t, i) => {
            const price = billing === "annual" ? t.annualPrice : t.monthlyPrice;
            const isCustom = t.monthlyPrice < 0;
            const isFree = t.name === "FREE";

            let cardBorderClass = "border-slate-700";
            if (isFree) cardBorderClass = "border-slate-800";
            if (t.popular) cardBorderClass = "border-2 border-teal-500";
            if (t.name === "CUSTOM") cardBorderClass = "border-slate-700";

            return (
              <div
                key={i}
                className={`bg-[#0f1629] rounded-2xl p-8 flex flex-col h-full relative ${
                  t.popular
                    ? "border-2 border-teal-500"
                    : `border ${cardBorderClass}`
                }`}
              >
                {t.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-lg font-black text-white uppercase">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">
                  {t.desc}
                </p>
                <div className="mt-6 mb-8 border-b border-slate-800 pb-8">
                  {isCustom ? (
                    <span className="text-4xl font-black text-white">
                      Contact Us
                    </span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-white">
                        ${price}
                      </span>
                      <span className="text-lg text-slate-400">/month</span>
                      {billing === "annual" && t.monthlyPrice > 0 && (
                        <div className="mt-1">
                          <span className="text-sm text-slate-600 line-through">
                            ${t.monthlyPrice}/month
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {t.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-3 text-sm leading-tight"
                    >
                      {f.ok ? (
                        <Check className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                      )}
                      <span
                        className={f.ok ? "text-slate-300" : "text-slate-600"}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <Link
                    href={t.href}
                    className="block text-center border border-slate-700 text-slate-300 hover:border-teal-500 hover:text-teal-400 w-full py-3 rounded-xl transition-all font-semibold"
                  >
                    {t.cta}
                  </Link>
                ) : isCustom ? (
                  <a
                    href={t.href}
                    className="block text-center border border-slate-700 text-slate-300 hover:border-slate-500 w-full py-3 rounded-xl transition-all font-semibold"
                  >
                    {t.cta}
                  </a>
                ) : t.popular ? (
                  <button
                    onClick={() => handleCheckout(t.name.toLowerCase())}
                    className="w-full bg-teal-500 text-white hover:bg-teal-400 py-3 rounded-xl font-semibold transition-colors"
                  >
                    {t.cta}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(t.name.toLowerCase())}
                    className="w-full border border-teal-500 text-teal-400 hover:bg-teal-500 hover:text-white py-3 rounded-xl font-semibold transition-all"
                  >
                    {t.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-[#0f1629] border border-slate-800 rounded-2xl overflow-hidden p-6"
              >
                <h3 className="text-white font-medium mb-2">{faq.q}</h3>
                <div className="h-px w-full bg-slate-800 mb-3" />
                <p className="text-sm text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080d1a] border-t border-slate-800 py-8 text-center text-xs text-slate-600">
        <p>© 2026 Phish-Slayer. Built by MinionCore.</p>
      </footer>
    </div>
  );
}
