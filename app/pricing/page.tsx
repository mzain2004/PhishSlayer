"use client";

export const dynamic = "force-static";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Shield,
  Zap,
  Building2,
  Users,
  ChevronDown,
} from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/email";

/* ─── Data ────────────────────────────────────────────────── */

const PLANS = [
  {
    name: "Free",
    icon: Shield,
    monthlyPrice: null as null | number,
    annualPrice: null as null | number,
    customPrice: "$0",
    period: "/mo",
    highlight: false,
    badge: null as string | null,
    cta: "Get Started",
    ctaStyle: "secondary" as "primary" | "secondary",
    ctaHref: "/sign-up",
    desc: "For individuals exploring autonomous SOC capabilities.",
    features: [
      "50 alerts / day",
      "L1 triage agent",
      "1 user seat",
      "Wazuh + Generic Syslog ingest",
      "Custom inbound webhook",
      "7-day data retention",
      "Community support",
    ],
    missing: ["L2 / L3 agents", "Microsoft 365", "Slack / PagerDuty"],
  },
  {
    name: "SOC Pro",
    icon: Zap,
    monthlyPrice: 1499,
    annualPrice: 1249,
    customPrice: null,
    period: "/mo",
    highlight: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
    ctaStyle: "primary" as "primary" | "secondary",
    ctaHref: "/sign-up",
    desc: "For growing MSSPs and in-house SOC teams that need full automation.",
    features: [
      "10,000 alerts / day",
      "L1 + L2 + L3 agent chain",
      "25 user seats",
      "Microsoft 365 / Entra ID",
      "Slack + PagerDuty",
      "Custom playbooks",
      "MSSP white-label",
      "Outbound webhooks",
      "90-day data retention",
      "Email SLA support (next-business-day)",
    ],
    missing: [],
  },
  {
    name: "Command Center",
    icon: Building2,
    monthlyPrice: 4999,
    annualPrice: 3999,
    customPrice: null,
    period: "/mo",
    highlight: false,
    badge: null,
    cta: "Start Free Trial",
    ctaStyle: "secondary" as "primary" | "secondary",
    ctaHref: "/sign-up",
    desc: "For enterprise security teams and high-volume MSSP operations.",
    features: [
      "Unlimited alerts",
      "Unlimited users",
      "Everything in SOC Pro",
      "SIEM connectors (Splunk, QRadar)",
      "TAXII 2.1 / STIX feeds",
      "Decepticon red-team hardening",
      "On-prem deployment option",
      "Dedicated success manager",
      "1-year data retention",
      "Priority SLA (4-hour response)",
    ],
    missing: [],
  },
  {
    name: "Enterprise",
    icon: Users,
    monthlyPrice: null,
    annualPrice: null,
    customPrice: "Custom",
    period: "",
    highlight: false,
    badge: null,
    cta: "Contact Sales",
    ctaStyle: "secondary" as "primary" | "secondary",
    ctaHref: `mailto:${CONTACT_EMAIL}`,
    desc: "For regulated industries, air-gapped deployments, and global MSSPs.",
    features: [
      "Everything in Command Center",
      "Custom alert volume",
      "Air-gapped / on-prem deployment",
      "Custom AI model fine-tuning",
      "Dedicated cloud infrastructure",
      "FedRAMP / ITAR compliance packages",
      "24/7 white-glove support",
      "Custom SLA + data residency",
    ],
    missing: [],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrades are effective immediately and prorated. Downgrades apply at the end of the current billing cycle. No penalties or contracts on monthly plans.",
  },
  {
    q: "Is the Free plan really free — forever?",
    a: "Yes. 50 alerts/day and L1 triage are always free. No credit card is required to sign up, and we will never force a trial expiry on the Free tier.",
  },
  {
    q: "What counts as an 'alert'?",
    a: "Each unique security event ingested from any connected source — Wazuh agent, syslog, webhook, Microsoft 365, or SIEM — counts as one alert against your daily quota.",
  },
  {
    q: "Do paid plans include a free trial?",
    a: "SOC Pro and Command Center both include a 14-day free trial with full feature access. No credit card is required to start the trial.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards via Stripe. Annual plans can also be invoiced via ACH or wire transfer. Contact us for purchase-order billing.",
  },
  {
    q: "What happens to my data after I cancel?",
    a: "Your data is retained for 60 days after cancellation. You can export everything during that window. After 60 days, all data is permanently and irreversibly deleted.",
  },
];

/* ─── Page ────────────────────────────────────────────────── */

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function displayPrice(plan: (typeof PLANS)[number]) {
    if (plan.customPrice) return plan.customPrice;
    const n = annual ? plan.annualPrice! : plan.monthlyPrice!;
    return `$${n.toLocaleString()}`;
  }

  return (
    <div
      className="min-h-screen font-sans overflow-x-hidden"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* ── Background ──────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(124,92,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(124,92,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[rgba(124,92,255,0.07)] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="relative z-10 border-b border-white/5 bg-[#080D12]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="PhishSlayer" className="h-8 w-auto" />
            <span className="text-base font-bold tracking-tight text-[#f0f0f5]">
              PhishSlayer
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9ca3af]">
            <Link href="/#how-it-works" className="hover:text-[#f0f0f5] transition-colors">
              How It Works
            </Link>
            <Link href="/#features" className="hover:text-[#f0f0f5] transition-colors">
              Features
            </Link>
            <Link
              href="/pricing"
              className="transition-colors"
              style={{ color: "var(--accent)" }}
            >
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-[#f0f0f5] transition-colors">
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-[#9ca3af] hover:text-[#f0f0f5] transition-colors px-3 py-1.5 hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#7C5CFF] to-[#A855F7] hover:opacity-90 transition-opacity shadow-lg shadow-[rgba(124,92,255,0.2)]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-6 text-center">
        <p
          className="text-xs font-mono uppercase tracking-widest mb-4"
          style={{ color: "var(--accent)" }}
        >
          Pricing
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#f0f0f5] mb-5">
          Scale with your SOC.
        </h1>
        <p className="text-lg text-[#9ca3af] max-w-xl mx-auto mb-10 leading-relaxed">
          From solo analysts to global MSSPs — pick the plan that matches your
          alert volume and response depth.
        </p>

        {/* Annual / Monthly toggle */}
        <div className="inline-flex items-center gap-4 p-1 rounded-xl border border-white/8 bg-white/[0.03] mb-16">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              !annual
                ? "bg-[rgba(124,92,255,0.2)] text-[#f0f0f5] border border-[rgba(124,92,255,0.3)]"
                : "text-[#9ca3af] hover:text-[#f0f0f5]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              annual
                ? "bg-[rgba(124,92,255,0.2)] text-[#f0f0f5] border border-[rgba(124,92,255,0.3)]"
                : "text-[#9ca3af] hover:text-[#f0f0f5]"
            }`}
          >
            Annual
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(124,92,255,0.25)",
                color: "#C4B5FD",
              }}
            >
              Save ~17%
            </span>
          </button>
        </div>
      </section>

      {/* ── Plans grid ──────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-7 ${
                  plan.highlight
                    ? "border-2 border-[#7C5CFF] bg-[rgba(124,92,255,0.10)] shadow-2xl shadow-[rgba(124,92,255,0.18)]"
                    : "border border-white/8 bg-white/[0.025]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#A855F7] text-[10px] font-bold text-white uppercase tracking-wider shadow-lg whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: plan.highlight
                        ? "rgba(124,92,255,0.25)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{
                        color: plan.highlight ? "#C4B5FD" : "#9ca3af",
                      }}
                    />
                  </div>
                  <h2 className="text-lg font-bold text-[#f0f0f5] mb-1">
                    {plan.name}
                  </h2>
                  <p className="text-xs text-[#9ca3af] leading-relaxed">
                    {plan.desc}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-[#f0f0f5] leading-none">
                      {displayPrice(plan)}
                    </span>
                    {plan.period && (
                      <span className="text-[#9ca3af] text-sm mb-0.5">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {annual && plan.monthlyPrice !== null && plan.annualPrice !== null && (
                    <p className="text-[11px] text-[#9ca3af] mt-1">
                      Billed annually · saves $
                      {((plan.monthlyPrice - plan.annualPrice) * 12).toLocaleString()}
                      /yr
                    </p>
                  )}
                  {!annual && plan.monthlyPrice !== null && plan.annualPrice !== null && (
                    <p className="text-[11px] text-[#9ca3af] mt-1">
                      Or ${plan.annualPrice.toLocaleString()}/mo billed annually
                    </p>
                  )}
                  {!plan.monthlyPrice && !plan.annualPrice && plan.name !== "Free" && (
                    <p className="text-[11px] text-[#9ca3af] mt-1">
                      Tailored to your deployment
                    </p>
                  )}
                </div>

                {/* CTA */}
                {plan.ctaHref.startsWith("mailto:") ? (
                  <a
                    href={plan.ctaHref}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all mb-6 flex items-center justify-center gap-1.5 ${
                      plan.ctaStyle === "primary"
                        ? "bg-gradient-to-r from-[#7C5CFF] to-[#A855F7] text-white hover:opacity-90 shadow-lg shadow-[rgba(124,92,255,0.3)]"
                        : "border border-white/10 bg-white/5 text-[#f0f0f5] hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all mb-6 flex items-center justify-center gap-1.5 ${
                      plan.ctaStyle === "primary"
                        ? "bg-gradient-to-r from-[#7C5CFF] to-[#A855F7] text-white hover:opacity-90 shadow-lg shadow-[rgba(124,92,255,0.3)]"
                        : "border border-white/10 bg-white/5 text-[#f0f0f5] hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {/* Feature list */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-[#9ca3af]"
                    >
                      <Check
                        className="w-3.5 h-3.5 mt-0.5 shrink-0"
                        style={{ color: plan.highlight ? "#A855F7" : "#10B981" }}
                      />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-[#9ca3af]/40"
                    >
                      <span className="w-3.5 h-3.5 mt-0.5 shrink-0 flex items-center justify-center text-[10px]">
                        —
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature comparison callout ────────────────────────── */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-[#9ca3af] mb-3">
            All plans include SSL/TLS encryption, 99.9% uptime SLA, and GDPR-ready data handling.
          </p>
          <p className="text-sm text-[#9ca3af]">
            Need a custom quote for a large deployment?{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              style={{ color: "var(--accent)" }}
              className="hover:underline"
            >
              Contact our sales team
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-28">
        <div className="text-center mb-12">
          <p
            className="text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#f0f0f5]">
            Common questions.
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/8 bg-white/[0.025] overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left group"
              >
                <span className="text-sm font-semibold text-[#f0f0f5] group-hover:text-white transition-colors pr-4">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#9ca3af] shrink-0 transition-transform duration-200 ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-[#9ca3af] leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/5 bg-white/[0.02] py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#f0f0f5] mb-4">
            Ready to automate your SOC?
          </h2>
          <p className="text-[#9ca3af] mb-8 leading-relaxed">
            Start free. No credit card required. Upgrade when your team is ready.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C5CFF] to-[#A855F7] hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xl shadow-[rgba(124,92,255,0.3)]"
            >
              Start Free <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="px-8 py-3.5 rounded-xl text-sm font-bold text-[#f0f0f5] border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-10 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="PhishSlayer" className="h-6 w-auto" />
            <span className="text-sm font-bold text-[#f0f0f5]">PhishSlayer</span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-[#9ca3af]">
            <Link href="/docs" className="hover:text-[#f0f0f5] transition-colors">
              Docs
            </Link>
            <Link href="/docs/security" className="hover:text-[#f0f0f5] transition-colors">
              Security
            </Link>
            <Link href="/privacy" className="hover:text-[#f0f0f5] transition-colors">
              Privacy
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hover:text-[#f0f0f5] transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-[#9ca3af]">
            © 2026 PhishSlayer — Cygnus Ventures SMC-Pvt Ltd
          </p>
        </div>
      </footer>
    </div>
  );
}
