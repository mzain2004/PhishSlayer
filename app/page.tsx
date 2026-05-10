'use client';

export const dynamic = 'force-static';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield, Zap, Eye, Users, Network,
  AlertTriangle, Clock, TrendingDown,
  ChevronRight, Check, Github, Linkedin, Twitter,
  Brain, Activity, Target,
} from 'lucide-react';

/* ─── Static data ─────────────────────────────────────────── */

const STATS = [
  { label: 'MTTR', value: '<10min' },
  { label: 'Auto-close', value: '70%' },
  { label: 'FP rate', value: '<10%' },
  { label: 'Coverage', value: '24/7' },
];

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    title: 'Alert Fatigue',
    desc: '10,000+ alerts/day — 95% noise your analysts never needed to see.',
  },
  {
    icon: Clock,
    title: 'Slow MTTR',
    desc: '45-minute industry average. PhishSlayer closes the same alert in under 10.',
  },
  {
    icon: TrendingDown,
    title: 'Manual Triage Waste',
    desc: '80% of analyst time spent on repetitive L1 work that should never touch a human.',
  },
];

const AGENT_STEPS = [
  {
    id: 'L1',
    model: 'Haiku',
    icon: Zap,
    title: 'L1 Triage',
    desc: 'Every alert enriched in 3s',
    color: '#6366F1',
    shadow: 'rgba(99,102,241,0.35)',
  },
  {
    id: 'L2',
    model: 'Sonnet',
    icon: Brain,
    title: 'L2 Response',
    desc: 'Consequence-checked auto-remediation',
    color: '#8B5CF6',
    shadow: 'rgba(139,92,246,0.35)',
  },
  {
    id: 'L3',
    model: 'Opus',
    icon: Eye,
    title: 'L3 Hunting',
    desc: 'Deep investigation swarms',
    color: '#A855F7',
    shadow: 'rgba(168,85,247,0.35)',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Agentic L1/L2/L3 Chain',
    desc: 'Multi-tier agents handle triage, response, and deep-dive hunting end to end — zero human queuing.',
  },
  {
    icon: Target,
    title: 'Consequence Prediction',
    desc: 'Every remediation is consequence-checked before execution. No blind firewall rules.',
  },
  {
    icon: Activity,
    title: 'Self-Evolving Agents',
    desc: 'HALO + OpenSpace + EvoMap continuously refine playbooks from closed alerts — no manual tuning.',
  },
  {
    icon: Users,
    title: 'Multi-Tenant MSSP Isolation',
    desc: 'Clerk orgs + Supabase RLS ensure zero data bleed between your clients.',
  },
  {
    icon: Shield,
    title: 'Decepticon Red-Team Hardening',
    desc: 'Built-in adversarial testing pressure-tests every agent decision before it reaches production.',
  },
  {
    icon: Network,
    title: '17+ Tool Integrations',
    desc: 'VirusTotal, Shodan, AbuseIPDB, Wazuh, Slack and more — all routed through the MCP Gateway.',
  },
];

const MOCK_ALERTS = [
  { id: 'ALT-0042', sev: 'CRITICAL', type: 'Phishing', src: '185.220.101.47', status: 'AUTO-CLOSED', ttl: '3s' },
  { id: 'ALT-0041', sev: 'HIGH', type: 'C2 Beacon', src: '104.21.45.230', status: 'L2 RESPONSE', ttl: '18s' },
  { id: 'ALT-0040', sev: 'HIGH', type: 'Lateral Move', src: '10.0.1.55', status: 'L3 HUNTING', ttl: '45s' },
  { id: 'ALT-0039', sev: 'MEDIUM', type: 'Recon Scan', src: '216.58.210.14', status: 'AUTO-CLOSED', ttl: '3s' },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    highlight: false,
    features: ['50 alerts/day', 'L1 triage only', '1 user', 'Community support'],
  },
  {
    name: 'SOC Pro',
    price: '$1,499',
    period: '/mo',
    highlight: true,
    badge: 'Most Popular',
    features: ['10,000 alerts/day', 'L1 + L2 + L3 chain', '25 users', 'Slack + email SLA', 'Custom playbooks', 'MSSP white-label'],
  },
  {
    name: 'Command Center',
    price: '$4,999',
    period: '/mo',
    highlight: false,
    features: ['Unlimited alerts', 'Unlimited users', 'Dedicated success manager', 'On-prem option', 'Red-team hardening', 'Priority SLA'],
  },
];

/* ─── Helpers ─────────────────────────────────────────────── */

function sevColor(sev: string) {
  if (sev === 'CRITICAL') return 'text-red-400';
  if (sev === 'HIGH') return 'text-orange-400';
  return 'text-yellow-400';
}

function statusStyle(status: string) {
  if (status === 'AUTO-CLOSED') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
  if (status === 'L3 HUNTING') return 'bg-purple-500/15 text-purple-400 border border-purple-500/25';
  return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25';
}

/* ─── Page ────────────────────────────────────────────────── */

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  /* Navbar scroll shadow */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Scroll-reveal via IntersectionObserver */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).dataset.visible = 'true';
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5] font-sans overflow-x-hidden selection:bg-indigo-500/30">

      {/* ── Matrix background ──────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Grid lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99,102,241,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Scanline */}
        <div className="scanline" />
        {/* Glow orbs */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-purple-600/7 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-indigo-600/6 rounded-full blur-[100px]" />
      </div>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#0a0a0f]/85 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#f0f0f5]">PhishSlayer</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9ca3af]">
            <a href="#how-it-works" className="hover:text-[#f0f0f5] transition-colors">How It Works</a>
            <a href="#features" className="hover:text-[#f0f0f5] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#f0f0f5] transition-colors">Pricing</a>
          </div>

          {/* Auth CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-[#9ca3af] hover:text-[#f0f0f5] transition-colors px-3 py-1.5 hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center pt-16"
      >
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-mono text-indigo-300 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
          </span>
          Autonomous Engine v2.0 — Online
        </div>

        {/* Shield logo mark */}
        <div className="w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
          <Shield className="w-10 h-10 text-white" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-[#f0f0f5] max-w-4xl leading-[1.1]">
          Your SOC.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
            Automated. Evolved.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-[#9ca3af] max-w-2xl mx-auto mb-10 leading-relaxed">
          L1+L2+L3 agentic triage, response and hunting — fully automated for MSSP scale.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30"
          >
            Start Free <ChevronRight className="w-4 h-4" />
          </Link>
          <a
            href="mailto:zainrana605890@gmail.com"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold text-[#f0f0f5] border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            Book Demo
          </a>
        </div>

        {/* Animated stat bar */}
        <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm py-4">
          <div className="stat-ticker flex gap-20 whitespace-nowrap will-change-transform">
            {[...STATS, ...STATS].map((s, i) => (
              <div key={i} className="flex items-center gap-3 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-widest">{s.label}</span>
                <span className="text-sm font-bold text-indigo-300 font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. PROBLEM
      ═══════════════════════════════════════════════════════ */}
      <section id="problem" className="relative z-10 max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[#f0f0f5]">Your analysts are drowning.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PAIN_POINTS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="reveal p-8 rounded-2xl border border-red-500/15 bg-red-500/5 group hover:border-red-500/30 hover:bg-red-500/8 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                <Icon className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-[#f0f0f5] mb-3">{title}</h3>
              <p className="text-sm text-[#9ca3af] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          3. HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative z-10 py-28 border-y border-white/5 bg-white/[0.02]"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-5xl font-bold text-[#f0f0f5]">
              Three agents.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                One mission.
              </span>
            </h2>
          </div>

          {/* Steps */}
          <div className="relative flex flex-col md:flex-row gap-0 items-stretch justify-center">
            {/* Connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-12 left-[calc(16.67%+3rem)] right-[calc(16.67%+3rem)] h-px z-0"
              style={{
                background: 'linear-gradient(to right, rgba(99,102,241,0.6), rgba(168,85,247,0.6))',
              }}
            />

            {AGENT_STEPS.map(({ id, model, icon: Icon, title, desc, color, shadow }, idx) => (
              <div key={id} className="reveal relative z-10 flex-1 flex flex-col items-center text-center px-6 pb-10 md:pb-0">
                {/* Icon box */}
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center mb-5 shadow-2xl"
                  style={{
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 40px ${shadow}`,
                  }}
                >
                  <Icon className="w-10 h-10" style={{ color }} />
                </div>

                {/* Agent badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#9ca3af] mb-4">
                  <span className="font-bold" style={{ color }}>{id}</span>
                  <span className="text-white/20">·</span>
                  {model}
                </div>

                <h3 className="text-xl font-bold text-[#f0f0f5] mb-2">{title}</h3>
                <p className="text-sm text-[#9ca3af] max-w-xs">{desc}</p>

                {/* Mobile connector arrow */}
                {idx < AGENT_STEPS.length - 1 && (
                  <ChevronRight className="md:hidden mt-8 w-5 h-5 rotate-90 text-indigo-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. FEATURES GRID (2×3)
      ═══════════════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[#f0f0f5]">
            Built for scale.{' '}
            <span className="text-[#9ca3af]">Engineered for speed.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="reveal group p-7 rounded-2xl border border-white/8 bg-white/[0.025] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:bg-indigo-500/20 transition-colors">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-[#f0f0f5] mb-2">{title}</h3>
              <p className="text-sm text-[#9ca3af] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. LIVE DEMO PREVIEW
      ═══════════════════════════════════════════════════════ */}
      <section id="demo" className="relative z-10 py-28 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">Live Demo Preview</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#f0f0f5]">See it in action</h2>
          </div>

          {/* Glassmorphism terminal card */}
          <div className="reveal rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-black/25">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-xs font-mono text-[#9ca3af]">PhishSlayer — Alert Queue</span>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            </div>

            {/* Column headers */}
            <div className="hidden md:grid grid-cols-5 gap-4 px-5 py-3 border-b border-white/5 text-[10px] font-mono text-[#9ca3af]/60 uppercase tracking-widest">
              <span>Alert ID</span>
              <span>Severity</span>
              <span>Type</span>
              <span>Source IP</span>
              <span>Status</span>
            </div>

            {/* Alert rows */}
            {MOCK_ALERTS.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-2 md:grid-cols-5 gap-4 px-5 py-4 border-b border-white/5 hover:bg-white/3 transition-colors items-center"
              >
                <span className="text-xs font-mono text-indigo-300">{a.id}</span>
                <span className={`text-xs font-mono font-bold ${sevColor(a.sev)}`}>{a.sev}</span>
                <span className="text-xs text-[#f0f0f5] hidden md:block">{a.type}</span>
                <span className="text-xs font-mono text-[#9ca3af] hidden md:block">{a.src}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${statusStyle(a.status)}`}>
                    {a.status}
                  </span>
                  <span className="text-[10px] font-mono text-[#9ca3af]">{a.ttl}</span>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <span className="text-[10px] font-mono text-[#9ca3af]">4 alerts · 3 auto-resolved · avg 3s triage</span>
              <span className="text-[10px] font-mono text-indigo-400">↑ 70% auto-close rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          6. PRICING
      ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[#f0f0f5]">Scale with your SOC.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`reveal rounded-2xl p-8 flex flex-col relative ${
                plan.highlight
                  ? 'border-2 border-indigo-500 bg-indigo-500/10 shadow-2xl shadow-indigo-500/20'
                  : 'border border-white/8 bg-white/[0.025]'
              }`}
            >
              {'badge' in plan && plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <h3 className="text-xl font-bold text-[#f0f0f5] mb-1">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-[#f0f0f5]">{plan.price}</span>
                <span className="text-[#9ca3af] text-sm mb-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#9ca3af]">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/30'
                    : 'border border-white/10 bg-white/5 text-[#f0f0f5] hover:bg-white/10'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[#9ca3af] mt-10">
          Need more?{' '}
          <a href="mailto:zainrana605890@gmail.com" className="text-indigo-400 hover:underline">
            Contact us
          </a>{' '}
          for a custom enterprise plan.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════
          7. SOCIAL PROOF / BADGES
      ═══════════════════════════════════════════════════════ */}
      <section id="about" className="relative z-10 py-24 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="reveal text-xl md:text-2xl font-semibold text-[#f0f0f5] mb-3">
            &ldquo;Built for MSSPs tired of duct-taping bots together.&rdquo;
          </p>
          <p className="reveal text-[#9ca3af] text-sm mb-12">
            Finally, a platform that thinks like a tier-3 analyst.
          </p>

          <div className="reveal flex flex-wrap items-center justify-center gap-4">
            {/* DEF CON */}
            <div className="px-5 py-3 rounded-xl border border-white/8 bg-white/5 flex items-center gap-2.5 text-sm text-[#9ca3af]">
              <Shield className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <span className="text-[#f0f0f5] font-semibold">DEF CON 34</span> CFP Submitted
              </span>
            </div>

            {/* MACH37 */}
            <div className="px-5 py-3 rounded-xl border border-white/8 bg-white/5 flex items-center gap-2.5 text-sm text-[#9ca3af]">
              <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <span className="text-[#f0f0f5] font-semibold">MACH37</span> Cyber Accelerator Applicant
              </span>
            </div>

            {/* Anthropic */}
            <div className="px-5 py-3 rounded-xl border border-white/8 bg-white/5 flex items-center gap-2.5 text-sm text-[#9ca3af]">
              <Brain className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Backed by <span className="text-[#f0f0f5] font-semibold">Anthropic Claude</span> Models
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          8. FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-12">
          {/* Brand */}
          <div className="flex-1 max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-[#f0f0f5]">PhishSlayer</span>
            </div>
            <p className="text-sm text-[#9ca3af] leading-relaxed">
              Autonomous SOC intelligence platform for MSSPs and enterprise security teams.
            </p>
          </div>

          {/* Nav links */}
          <div>
            <h5 className="text-[10px] font-semibold text-[#f0f0f5] uppercase tracking-widest mb-4">Navigate</h5>
            <ul className="space-y-2.5">
              <li>
                <Link href="/dashboard" className="text-sm text-[#9ca3af] hover:text-indigo-400 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#features" className="text-sm text-[#9ca3af] hover:text-indigo-400 transition-colors">
                  Docs
                </a>
              </li>
              <li>
                <a
                  href="mailto:zainrana605890@gmail.com"
                  className="text-sm text-[#9ca3af] hover:text-indigo-400 transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-[#9ca3af] hover:text-indigo-400 transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/mzain2004"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-white/8 bg-white/5 flex items-center justify-center text-[#9ca3af] hover:text-[#f0f0f5] hover:border-white/20 transition-all"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-white/8 bg-white/5 flex items-center justify-center text-[#9ca3af] hover:text-[#f0f0f5] hover:border-white/20 transition-all"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-white/8 bg-white/5 flex items-center justify-center text-[#9ca3af] hover:text-[#f0f0f5] hover:border-white/20 transition-all"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#9ca3af]">
            © 2026 PhishSlayer — Cygnus Ventures SMC-Pvt Ltd
          </p>
          <p className="text-xs text-[#9ca3af]/40">All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
