"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Star,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

const tiers = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    desc: "For individuals exploring threat intelligence",
    cta: "Get Started Free",
    href: "/auth/signup",
    popular: false,
    features: [
      { text: "10 scans per day", ok: true },
      { text: "Basic VirusTotal scanning", ok: true },
      { text: "Email threat alerts", ok: true },
      { text: "1 user account", ok: true },
      { text: "7-day scan history", ok: true },
      { text: "AI Heuristics Engine", ok: false },
      { text: "Port Patrol", ok: false },
      { text: "SIEM Integration", ok: false },
      { text: "Team management", ok: false },
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    annualPrice: 23,
    desc: "For SOC analysts who need deeper analysis",
    cta: "Start 14-Day Free Trial",
    href: "/auth/signup?plan=pro",
    popular: true,
    features: [
      { text: "Unlimited scans", ok: true },
      { text: "AI Heuristics Engine (Gemini)", ok: true },
      { text: "Port Patrol", ok: true },
      { text: "Deep Scan Suite (8 tabs)", ok: true },
      { text: "SIEM Integration", ok: true },
      { text: "Discord + Email alerts", ok: true },
      { text: "5 team members", ok: true },
      { text: "90-day scan history", ok: true },
      { text: "PDF report export", ok: true },
      { text: "API access (1,000 calls/mo)", ok: true },
      { text: "Full RBAC", ok: false },
      { text: "Audit logging", ok: false },
      { text: "Takedown Generator", ok: false },
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: 99,
    annualPrice: 79,
    desc: "For SOC teams managing an organization",
    cta: "Start 14-Day Free Trial",
    href: "/auth/signup?plan=enterprise",
    popular: false,
    features: [
      { text: "Everything in Pro", ok: true },
      { text: "Full RBAC (4 role tiers)", ok: true },
      { text: "Audit logging", ok: true },
      { text: "Takedown Generator", ok: true },
      { text: "User Management", ok: true },
      { text: "Unlimited team members", ok: true },
      { text: "Unlimited scan history", ok: true },
      { text: "API access (unlimited)", ok: true },
      { text: "Priority email support", ok: true },
      { text: "Custom Intel Vault", ok: true },
      { text: "Webhook integrations", ok: true },
    ],
  },
  {
    name: "Custom",
    monthlyPrice: -1,
    annualPrice: -1,
    desc: "For enterprises with unique requirements",
    cta: "Contact Sales",
    href: "mailto:sales@phishslayer.tech",
    popular: false,
    features: [
      { text: "Everything in Enterprise", ok: true },
      { text: "On-premise deployment option", ok: true },
      { text: "Custom scan limits", ok: true },
      { text: "SLA guarantee (99.9% uptime)", ok: true },
      { text: "Dedicated account manager", ok: true },
      { text: "Custom integrations", ok: true },
      { text: "Security audit assistance", ok: true },
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
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async (plan: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          billingPeriod: annual ? "annual" : "monthly",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) {
          toast.info("Payments coming soon! Sign up for the waitlist.");
          window.location.href = "/auth/signup";
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
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-900 font-black text-xl"
          >
            <Shield className="w-6 h-6 text-teal-500" />
            Phish-Slayer
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 bg-teal-500 text-white text-sm font-bold rounded-lg hover:bg-teal-600 transition-colors"
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
          className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Pricing that scales with your team
        </h1>
        <p className="text-slate-500 mt-4 text-lg max-w-lg mx-auto">
          Start free. Upgrade when you&apos;re ready.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span
            className={`text-sm font-semibold ${!annual ? "text-slate-900" : "text-slate-400"}`}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-teal-500" : "bg-slate-300"}`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? "translate-x-7" : "translate-x-0.5"}`}
            />
          </button>
          <span
            className={`text-sm font-semibold ${annual ? "text-slate-900" : "text-slate-400"}`}
          >
            Annual
          </span>
          {annual && (
            <span className="px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">
              Save 20%
            </span>
          )}
        </div>
      </header>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((t, i) => {
            const price = annual ? t.annualPrice : t.monthlyPrice;
            const isCustom = t.monthlyPrice < 0;

            return (
              <div
                key={i}
                className={`rounded-2xl p-6 flex flex-col h-full relative ${
                  t.popular
                    ? "bg-white border-2 border-teal-500 shadow-xl shadow-teal-500/10"
                    : "bg-white border border-slate-200 shadow-sm"
                }`}
              >
                {t.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3 h-3" /> Most Popular
                  </span>
                )}
                <h3 className="text-lg font-black text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                <div className="mt-4 mb-6">
                  {isCustom ? (
                    <span className="text-3xl font-black text-slate-900">
                      Contact us
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-slate-900">
                        ${price}
                      </span>
                      <span className="text-sm text-slate-400">/month</span>
                      {annual && t.monthlyPrice > 0 && (
                        <span className="ml-2 text-xs text-slate-400 line-through">
                          ${t.monthlyPrice}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {t.features.map((f, j) => (
                    <li
                      key={j}
                      className={`flex items-start gap-2 text-sm ${f.ok ? "text-slate-700" : "text-slate-400"}`}
                    >
                      {f.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                {t.name === "Free" || isCustom ? (
                  <Link
                    href={t.href}
                    className="block text-center py-3 rounded-lg text-sm font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {t.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(t.name.toLowerCase())}
                    className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                      t.popular
                        ? "bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/25"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
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
      <section className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-900">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Phish-Slayer. Built by MinionCore.</p>
      </footer>
    </div>
  );
}
