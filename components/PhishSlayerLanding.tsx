"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence, useScroll } from "framer-motion";
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
  Star,
  Quote,
  ArrowRight,
} from "lucide-react";
import { BackgroundBeams } from "@/lib/ui/aceternity/background-beams";
import { Spotlight } from "@/lib/ui/aceternity/spotlight";
import { Typewriter } from "@/lib/ui/aceternity/typewriter";
import { FloatingThreatCard } from "@/lib/ui/aceternity/floating-card";
import { ParticleNetwork } from "@/components/ui/particle-network";
import { TiltCard } from "@/components/ui/tilt-card";
import { GlowingEffect } from "@/components/ui/glowing-effect";

/* ─── Animation variants ──────────────────────────────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── Animated counter ────────────────────────────────────── */
function Counter({
  end,
  suffix = "",
  label,
}: {
  end: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const dur = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / dur, 1);
      setVal(Math.floor(progress * end));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, end]);

  return (
    <div ref={ref} className="text-center">
      <span className="text-3xl md:text-4xl font-black text-teal-400">
        {val.toLocaleString()}
        {suffix}
      </span>
      <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">
        {label}
      </p>
    </div>
  );
}

/* ─── Navbar ──────────────────────────────────────────────── */
function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
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
          ? "bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-slate-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-black text-xl tracking-tight"
        >
          <Shield className="w-6 h-6 text-teal-400" /> Phish-Slayer
        </Link>
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
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Go to Dashboard →
            </a>
          ) : (
            <>
              <a
                href="/auth/login"
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Login
              </a>
              <a
                href="/auth/signup"
                className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Start Free
              </a>
            </>
          )}
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#0a0f1e]/95 backdrop-blur-xl border-t border-white/10 px-6 pb-6 space-y-3 overflow-hidden"
          >
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
            {isAuthenticated ? (
              <a
                href="/dashboard"
                className="block bg-teal-500 text-white text-center py-2.5 rounded-lg font-bold mt-2"
              >
                Go to Dashboard →
              </a>
            ) : (
              <>
                <Link href="/auth/login" className="block text-slate-300 py-2">
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="block bg-teal-500 text-white text-center py-2.5 rounded-lg font-bold"
                >
                  Start Free
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────── */
interface Props { isAuthenticated?: boolean }
const PhishSlayerLanding: React.FC<Props> = ({ isAuthenticated = false }) => {
  const { scrollYProgress } = useScroll();

  return (
    <div className="bg-[#0a0f1e] text-white font-sans overflow-x-hidden">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2dd4bf] via-[#a78bfa] to-[#2dd4bf] origin-left z-[100]"
        style={{ scaleX: scrollYProgress }}
      />
      <ParticleNetwork />
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(45,212,191,0.15)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      />
      <Navbar isAuthenticated={isAuthenticated} />

      {/* ───── SECTION 1: HERO ───── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <BackgroundBeams />
        <Spotlight />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full py-16">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-2 mb-6 text-teal-400 text-sm"
            >
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              Enterprise Cybersecurity Platform
            </motion.div>

            <h1 className="text-5xl lg:text-7xl font-black text-white mb-2 leading-tight">
              Detect. Analyze.
            </h1>
            <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                <Typewriter
                  words={["Neutralize.", "Respond.", "Protect.", "Dominate."]}
                />
              </span>
            </h1>

            <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
              AI-powered threat intelligence for SOC teams. Real-time scanning,
              behavioral analysis, and automated incident response in one
              terminal.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth/signup'}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-sm shadow-xl shadow-teal-500/25"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Free"} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {[
                "✓ No credit card required",
                "✓ Setup in 5 minutes",
                "✓ SOC2 Ready",
              ].map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <FloatingThreatCard />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── SECTION 2: STATS ───── */}
      <section className="relative bg-slate-900/50 border-y border-slate-800 py-14">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
          <Counter end={50000} suffix="+" label="Threats Analyzed" />
          <Counter end={99} suffix="%" label="Detection Rate" />
          <Counter end={2} suffix="s" label="Avg Scan Time" />
          <Counter end={247} suffix="" label="24/7 Monitoring" />
        </div>
      </section>

      {/* ───── SECTION 3: HOW IT WORKS ───── */}
      <section id="how-it-works" className="bg-[#f8fafc] text-[#0f172a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Three Gates. Zero Compromise.
            </h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              Every scan runs through our proprietary 3-gate pipeline
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: "🛡️",
                title: "Gate 1 — Whitelist Check",
                desc: "Instant domain whitelist lookup — safe domains pass through",
              },
              {
                icon: "🔍",
                title: "Gate 2 — Intel Vault",
                desc: "Cross-reference proprietary threat intelligence database",
              },
              {
                icon: "🤖",
                title: "Gate 3 — AI Analysis",
                desc: "VirusTotal + Gemini AI deep behavioral analysis",
              },
            ].map((g, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <TiltCard className="relative bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all group">
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
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───── SECTION 4: FEATURES ───── */}
      <section
        id="features"
        className="bg-[#f8fafc] text-[#0f172a] py-24 border-t border-slate-100"
      >
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Everything Your SOC Team Needs
            </h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: <Brain className="w-6 h-6" />,
                title: "AI Heuristics Engine",
                desc: "Gemini AI detects psychological manipulation and credential harvesting in real-time",
              },
              {
                icon: <Search className="w-6 h-6" />,
                title: "Deep Scan Suite",
                desc: "WHOIS, SSL, DNS, DOM Tree, Typosquatting — 8 analysis tabs for complete threat profiling",
              },
              {
                icon: <Bell className="w-6 h-6" />,
                title: "Real-Time Alerts",
                desc: "Discord webhooks and email notifications fire instantly when threats are detected",
              },
              {
                icon: <Gavel className="w-6 h-6" />,
                title: "Takedown Generator",
                desc: "Auto-generate abuse reports with one-click Gmail and PhishTank submission",
              },
              {
                icon: <Send className="w-6 h-6" />,
                title: "SIEM Integration",
                desc: "Export threat data in STIX 2.1 to Splunk, Elastic SIEM, or Microsoft Sentinel",
              },
              {
                icon: <Radar className="w-6 h-6" />,
                title: "Port Patrol",
                desc: "Active reconnaissance scans 16 high-risk ports to identify exposed surfaces",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -4, borderColor: "rgba(13,148,136,0.5)" }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all h-full cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───── SECTION 5: DASHBOARD PREVIEW ───── */}
      <section className="bg-[#0a0f1e] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              The God&apos;s Eye Command Center
            </h2>
            <p className="text-slate-400 mt-3">
              A data-dense SOC dashboard built for speed
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
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
              <div className="grid md:grid-cols-2 gap-3 px-5 pb-5">
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
                          background:
                            "linear-gradient(to top, #0d9488, #14b8a6)",
                        }}
                      />
                    ))}
                  </div>
                </div>
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
          </motion.div>
        </div>
      </section>

      {/* ───── SECTION 6: TESTIMONIALS ───── */}
      <section className="bg-[#f8fafc] text-[#0f172a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Trusted by Security Teams
            </h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-6"
          >
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
              <motion.div key={i} variants={fadeInUp}>
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───── SECTION 7: PRICING ───── */}
      <section id="pricing" className="bg-[#0a0f1e] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400 mt-3">
              Start free. Scale as you grow.
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
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
                  "AI Heuristics",
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
                cta: "Start Enterprise",
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
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ scale: p.pop ? 1.02 : 1 }}
                className={`relative isolate overflow-hidden rounded-2xl p-6 flex flex-col h-full ${
                  p.pop
                    ? "bg-gradient-to-b from-teal-900/40 to-[#111827] border-2 border-teal-500 shadow-lg shadow-teal-500/10"
                    : "bg-[#111827] border border-white/10"
                }`}
              >
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={100}
                  inactiveZone={0.01}
                  borderWidth={2}
                />
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
                      <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />{" "}
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
              </motion.div>
            ))}
          </motion.div>
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

      {/* ───── SECTION 8: CTA ───── */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-500 py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Ready to secure your organization?
            </h2>
            <p className="text-teal-100 mb-8 text-lg">
              Join hundreds of SOC teams using Phish-Slayer
            </p>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-10 py-4 bg-white text-teal-700 font-black rounded-xl text-base shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── SECTION 9: FOOTER ───── */}
      <footer className="bg-[#070b16] text-slate-400 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 text-white font-black text-lg mb-3">
                <Shield className="w-5 h-5 text-teal-400" /> Phish-Slayer
              </div>
              <p className="text-sm leading-relaxed">
                Protecting the internet, one scan at a time.
              </p>
            </div>
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
    </div>
  );
}

export default PhishSlayerLanding;
