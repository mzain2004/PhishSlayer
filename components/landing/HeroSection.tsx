"use client";

import { lazy, Suspense } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { ParticleNetwork } from "@/components/ui/particle-network";

const HeroShield3D = lazy(() => import("@/components/ui/hero-shield-3d"));

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

const fadeInUp = {
  hidden: { opacity: 0, y: 80 },
  visible: { opacity: 1, y: 0, transition: springConfig },
};

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden bg-[#050507] antialiased">
      {/* Ambient teal radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#0D9488]/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <ParticleNetwork disabled={!!prefersReducedMotion} />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
        {/* Left Content */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.25 } }
          }}
          className="max-w-2xl"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="mb-6 inline-flex">
            <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-2xl border border-white/5 text-teal-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              New — Adaptive AI Defense Engine in Development
            </div>
          </motion.div>

          {/* Headlines */}
          <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight antialiased">
            The Threat Intelligence Platform Built for Every Security Team
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg text-slate-400 mb-8 leading-relaxed antialiased">
            AI-powered URL and IP scanning. Real-time EDR agent fleet monitoring. Enterprise-grade threat intelligence at <span className="text-white font-bold">$49/month</span> — not $25,000/year.
          </motion.p>

          {/* Buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link
              href="/auth/signup"
              className="inline-flex justify-center items-center gap-2 bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 text-slate-950 font-bold px-8 py-3.5 rounded-lg transition-all"
            >
              Start Free — No Card Required <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex justify-center items-center gap-2 bg-transparent border border-white/10 hover:border-teal-500/30 hover:bg-white/[0.02] text-white font-bold px-8 py-3.5 rounded-lg transition-all"
            >
              See How It Works <PlayCircle className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div variants={fadeInUp} className="flex items-center gap-3 text-sm font-medium text-slate-400 antialiased">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050507] bg-slate-800 flex items-center justify-center text-[10px] text-teal-400 font-mono">
                  OP
                </div>
              ))}
            </div>
            <span>Trusted by security analysts in 10+ countries</span>
          </motion.div>
        </motion.div>

        {/* Right 3D Visual — The Shield */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ ...springConfig, delay: 0.4 }}
          className="hidden lg:flex justify-center items-center relative"
        >
          <div className="absolute inset-0 bg-[#0D9488]/[0.06] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 w-full h-[500px]">
            {!prefersReducedMotion && (
              <Suspense fallback={<div className="w-full h-full" />}>
                <HeroShield3D />
              </Suspense>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
