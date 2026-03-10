"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  Menu,
  X,
  Brain,
  Search,
  Bell,
  Gavel,
  Send,
  Radar,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Star,
  Quote,
  ArrowRight,
} from "lucide-react";

/* ─── NAV ─────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-black text-xl tracking-tight"
        >
          <Shield className="w-6 h-6 text-teal-400" />
          Phish-Slayer
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-white transition-colors"
          >
            How it Works
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="/api/v1" className="hover:text-white transition-colors">
            API
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-teal-500/20"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0f1e]/95 backdrop-blur-xl border-t border-white/10 px-6 pb-6 space-y-3">
          <a
            href="#features"
            onClick={() => setMenuOpen(false)}
            className="block text-slate-300 py-2"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMenuOpen(false)}
            className="block text-slate-300 py-2"
          >
            How it Works
          </a>
          <a
            href="#pricing"
            onClick={() => setMenuOpen(false)}
            className="block text-slate-300 py-2"
          >
            Pricing
          </a>
          <Link href="/auth/login" className="block text-slate-300 py-2">
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="block bg-teal-500 text-white text-center py-2.5 rounded-lg font-bold"
          >
            Start Free
          </Link>
        </div>
      )}
    </nav>
  );
}

/* ─── ANIMATED COUNTER ────────────────────────────────────── */
function AnimatedStat({
  end,
  suffix,
  label,
}: {
  end: string;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center">
      <span
        className={`text-3xl md:text-4xl font-black text-teal-400 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {end}
        {suffix}
      </span>
      <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">
        {label}
      </p>
    </div>
  );
}

/* ─── FADE-IN WRAPPER ─────────────────────────────────────── */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true);
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="bg-[#0a0f1e] text-white font-sans overflow-x-hidden">
      <Navbar />

      {/* ───── SECTION 1: HERO ───── */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Animated grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[160px]" />

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center w-full py-16">
          {/* Left */}
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
              🛡️ Enterprise Cybersecurity Platform
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
              Detect. Analyze.
              <br />
              <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
                Neutralize Threats.
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              AI-powered threat intelligence platform for SOC teams. Real-time
              scanning, behavioral analysis, and automated incident response —
              all in one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/signup"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-xl text-base transition-all shadow-xl shadow-teal-500/25 hover:-translate-y-0.5"
              >
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-white font-bold rounded-xl text-base transition-all hover:bg-white/5"
              >
                View Live Demo
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
              <span>✓ No credit card required</span>
              <span>✓ Setup in 5 minutes</span>
              <span>✓ SOC2 Ready</span>
            </div>
          </div>

          {/* Right — floating dashboard mockup */}
          <div className="hidden lg:flex justify-center">
            <div className="relative animate-hero-float">
              <div className="w-[380px] bg-[#111827] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1117] border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-auto text-[10px] text-slate-500 font-mono">
                    phishslayer.tech
                  </span>
                </div>
                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Threat Intel
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          malware.xyz
                        </p>
                        <p className="text-[10px] text-red-300">
                          Phishing Infrastructure
                        </p>
                      </div>
                    </div>
                    {/* Risk bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Risk Score</span>
                        <span className="text-red-400 font-bold">87/100</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-risk-fill"
                          style={{ width: "87%" }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <Brain className="w-3 h-3 text-violet-400" />
                      <span className="text-slate-300">
                        Gemini AI: Credential Harvesting Detected
                      </span>
                    </div>
                  </div>
                  <button className="w-full py-2.5 bg-teal-500/20 border border-teal-500/30 rounded-lg text-xs font-bold text-teal-300 hover:bg-teal-500/30 transition-colors">
                    View Full Report →
                  </button>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ───── SECTION 2: STATS ───── */}
      <section className="relative bg-[#070b16] border-y border-white/5 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
          <AnimatedStat end="50,000" suffix="+" label="Threats Analyzed" />
          <AnimatedStat end="99.2" suffix="%" label="Detection Rate" />
          <AnimatedStat end="<2" suffix="s" label="Scan Time" />
          <AnimatedStat end="24/7" label="Monitoring" />
        </div>
      </section>

      {/* ───── SECTION 3: HOW IT WORKS ───── */}
      <section id="how-it-works" className="bg-[#f8fafc] text-[#0f172a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Three Gates. Zero Compromise.
            </h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              Every scan runs through our proprietary 3-gate pipeline
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🛡️",
                title: "Gate 1 — Whitelist Check",
                desc: "Instant lookup against your trusted domains",
              },
              {
                icon: "🔍",
                title: "Gate 2 — Intel Vault",
                desc: "Cross-reference proprietary threat intelligence",
              },
              {
                icon: "🤖",
                title: "Gate 3 — AI Analysis",
                desc: "VirusTotal + Gemini AI deep behavioral analysis",
              },
            ].map((g, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="relative bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all group">
                  <div className="text-4xl mb-4">{g.icon}</div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">
                    {g.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {g.desc}
                  </p>
                  {i < 2 && (
                    <ChevronRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 z-10" />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION 4: FEATURES ───── */}
      <section
        id="features"
        className="bg-[#f8fafc] text-[#0f172a] py-24 border-t border-slate-100"
      >
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Everything Your SOC Team Needs
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="w-6 h-6" />,
                title: "AI Heuristics Engine",
                desc: "Gemini AI detects psychological manipulation and credential harvesting patterns in real-time",
              },
              {
                icon: <Search className="w-6 h-6" />,
                title: "Deep Scan Suite",
                desc: "WHOIS, SSL, DNS, DOM Tree, Typosquatting — 8 analysis tabs for complete threat profiling",
              },
              {
                icon: <Bell className="w-6 h-6" />,
                title: "Real-Time Alerts",
                desc: "Discord webhooks and email notifications fire instantly when malicious threats are detected",
              },
              {
                icon: <Gavel className="w-6 h-6" />,
                title: "Takedown Generator",
                desc: "Auto-generate professional abuse reports with one-click Gmail and PhishTank submission",
              },
              {
                icon: <Send className="w-6 h-6" />,
                title: "SIEM Integration",
                desc: "Export threat data in STIX 2.1 format to Splunk, Elastic SIEM, or Microsoft Sentinel",
              },
              {
                icon: <Radar className="w-6 h-6" />,
                title: "Port Patrol",
                desc: "Active reconnaissance scans 16 high-risk ports to identify exposed attack surfaces",
              },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-300 hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION 5: DASHBOARD PREVIEW ───── */}
      <section className="bg-[#0a0f1e] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              The God&apos;s Eye Command Center
            </h2>
            <p className="text-slate-400 mt-3">
              A data-dense SOC dashboard built for speed
            </p>
          </FadeIn>
          <FadeIn>
            <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Top nav */}
              <div className="flex items-center justify-between px-5 py-3 bg-[#0d1117] border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-black text-white">
                    Phish-Slayer
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] text-slate-500 font-medium">
                  <span>Dashboard</span>
                  <span className="text-teal-400">Scans</span>
                  <span>Incidents</span>
                  <span>Intel</span>
                </div>
              </div>
              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-3 p-5">
                {[
                  {
                    label: "Total Scans",
                    val: "2,847",
                    color: "text-teal-400",
                  },
                  { label: "Malicious", val: "312", color: "text-red-400" },
                  {
                    label: "Open Incidents",
                    val: "17",
                    color: "text-orange-400",
                  },
                  {
                    label: "Intel Vault",
                    val: "1,203",
                    color: "text-indigo-400",
                  },
                ].map((k, i) => (
                  <div
                    key={i}
                    className="bg-white/5 rounded-xl p-4 border border-white/5"
                  >
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {k.label}
                    </p>
                    <p className={`text-2xl font-black mt-1 ${k.color}`}>
                      {k.val}
                    </p>
                  </div>
                ))}
              </div>
              {/* Chart + Feed */}
              <div className="grid md:grid-cols-2 gap-3 px-5 pb-5">
                {/* Mini chart */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
                    Scan Volume (7d)
                  </p>
                  <div className="flex items-end gap-1.5 h-24">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(to top, #0d9488, #14b8a6)`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Recent activity */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
                    Recent Activity
                  </p>
                  <div className="space-y-2.5">
                    {[
                      {
                        dot: "bg-red-500",
                        target: "malware-payload.ru",
                        score: "94",
                        color: "text-red-400",
                      },
                      {
                        dot: "bg-yellow-500",
                        target: "suspicious-login.net",
                        score: "67",
                        color: "text-yellow-400",
                      },
                      {
                        dot: "bg-emerald-500",
                        target: "github.com",
                        score: "1",
                        color: "text-emerald-400",
                      },
                    ].map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                          <span className="text-xs font-mono text-slate-300">
                            {a.target}
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${a.color}`}>
                          {a.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ───── SECTION 6: TESTIMONIALS ───── */}
      <section className="bg-[#f8fafc] text-[#0f172a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Trusted by Security Teams
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                q: "Phish-Slayer caught a phishing campaign targeting our executives before any damage was done.",
                name: "Sarah K.",
                role: "SOC Lead @ TechCorp",
              },
              {
                q: "The AI heuristics engine identified manipulation tactics we would have missed with traditional tools.",
                name: "Marcus R.",
                role: "CISO @ FinanceGroup",
              },
              {
                q: "Setup took 5 minutes. Within an hour we had our first threat detected and blocked.",
                name: "Aisha M.",
                role: "Security Analyst @ StartupXYZ",
              },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full flex flex-col">
                  <Quote className="w-8 h-8 text-teal-200 mb-4" />
                  <p className="text-sm text-slate-600 leading-relaxed flex-1">
                    &ldquo;{t.q}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION 7: PRICING ───── */}
      <section id="pricing" className="bg-[#0a0f1e] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400 mt-3">
              Start free. Scale as you grow.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: "Free",
                price: "$0",
                period: "/month",
                features: [
                  "10 scans/day",
                  "Basic threat intel",
                  "Email alerts",
                  "1 user",
                ],
                cta: "Get Started Free",
                href: "/auth/signup",
                pop: false,
              },
              {
                name: "Pro",
                price: "$29",
                period: "/month",
                features: [
                  "Unlimited scans",
                  "AI Heuristics Engine",
                  "Port Patrol",
                  "SIEM Integration",
                  "5 users",
                  "Discord alerts",
                ],
                cta: "Start Pro Trial",
                href: "/auth/signup?plan=pro",
                pop: true,
              },
              {
                name: "Enterprise",
                price: "$99",
                period: "/month",
                features: [
                  "Everything in Pro",
                  "Full RBAC",
                  "Audit logging",
                  "Takedown Generator",
                  "Unlimited users",
                  "Priority support",
                ],
                cta: "Start Enterprise Trial",
                href: "/auth/signup?plan=enterprise",
                pop: false,
              },
              {
                name: "Custom",
                price: "Contact",
                period: " us",
                features: [
                  "Custom scan limits",
                  "On-premise deploy",
                  "SLA guarantee",
                  "Dedicated support",
                ],
                cta: "Contact Sales",
                href: "mailto:sales@phishslayer.tech",
                pop: false,
              },
            ].map((p, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div
                  className={`rounded-2xl p-6 flex flex-col h-full ${
                    p.pop
                      ? "bg-gradient-to-b from-teal-900/40 to-[#111827] border-2 border-teal-500 shadow-lg shadow-teal-500/10 relative"
                      : "bg-[#111827] border border-white/10"
                  }`}
                >
                  {p.pop && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3" /> Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-black text-white">{p.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-black text-white">
                      {p.price}
                    </span>
                    <span className="text-sm text-slate-400">{p.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {p.features.map((f, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-2 text-sm text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.href}
                    className={`block text-center py-3 rounded-lg text-sm font-bold transition-all ${
                      p.pop
                        ? "bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/25"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
          <p className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-sm text-teal-400 hover:text-teal-300 font-semibold"
            >
              View full pricing details →
            </Link>
          </p>
        </div>
      </section>

      {/* ───── SECTION 8: CTA BANNER ───── */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-500 py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Ready to secure your organization?
          </h2>
          <p className="text-teal-100 mb-8 text-lg">
            Join hundreds of SOC teams using Phish-Slayer
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-teal-700 font-black rounded-xl text-base shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ───── SECTION 9: FOOTER ───── */}
      <footer className="bg-[#070b16] text-slate-400 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 text-white font-black text-lg mb-3">
                <Shield className="w-5 h-5 text-teal-400" />
                Phish-Slayer
              </div>
              <p className="text-sm leading-relaxed">
                Protecting the internet, one scan at a time.
              </p>
            </div>
            {/* Links */}
            {[
              {
                title: "Product",
                links: [
                  { l: "Features", h: "#features" },
                  { l: "Pricing", h: "/pricing" },
                  { l: "API Docs", h: "/api/v1" },
                  { l: "Changelog", h: "#" },
                ],
              },
              {
                title: "Security",
                links: [
                  { l: "How it works", h: "#how-it-works" },
                  { l: "Compliance", h: "#" },
                  { l: "Bug Bounty", h: "#" },
                ],
              },
              {
                title: "Company",
                links: [
                  { l: "About", h: "#" },
                  { l: "Blog", h: "#" },
                  { l: "Careers", h: "#" },
                  { l: "Contact", h: "mailto:support@phishslayer.tech" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { l: "Privacy Policy", h: "#" },
                  { l: "Terms of Service", h: "#" },
                  { l: "Cookie Policy", h: "#" },
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((lnk, j) => (
                    <li key={j}>
                      <a
                        href={lnk.h}
                        className="text-sm hover:text-white transition-colors"
                      >
                        {lnk.l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
            © 2026 Phish-Slayer. Built by MinionCore.
          </div>
        </div>
      </footer>

      {/* ───── CSS ANIMATIONS ───── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes hero-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes risk-fill {
          from { width: 0%; }
          to { width: 87%; }
        }
        .animate-hero-float { animation: hero-float 3s ease-in-out infinite; }
        .animate-risk-fill { animation: risk-fill 1.5s ease-out forwards; }
      `,
        }}
      />
    </div>
  );
}
