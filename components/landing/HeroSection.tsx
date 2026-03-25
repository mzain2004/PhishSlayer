"use client";

import { lazy, Suspense } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { ParticleNetwork } from "@/components/ui/particle-network";

const HeroShield3D = lazy(() => import("@/components/ui/hero-shield-3d"));

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } },
};

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden bg-[#050505]">
      {/* Abstract particle network bg */}
      <ParticleNetwork disabled={!!prefersReducedMotion} />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
        {/* Left Content */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
          className="max-w-2xl"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="mb-6 inline-flex">
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 text-[#D946EF] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse shadow-[0_0_10px_#8B5CF6]" />
              New — Adaptive AI Defense Engine in Development
            </div>
          </motion.div>

          {/* Headlines */}
          <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6">
            The Threat Intelligence Platform Built for Every Security Team
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg text-[#8B949E] mb-8 leading-relaxed">
            AI-powered URL and IP scanning. Real-time EDR agent fleet monitoring. Enterprise-grade threat intelligence at <span className="text-white font-bold">$49/month</span> — not $25,000/year.
          </motion.p>

          {/* Buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link
              href="/auth/signup"
              className="inline-flex justify-center items-center gap-2 bg-[#D946EF] hover:bg-[#D946EF]/90 text-white font-bold px-8 py-3.5 rounded-[8px] transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] border border-[#D946EF]/50"
            >
              Start Free — No Card Required <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex justify-center items-center gap-2 bg-transparent border border-white/10 hover:bg-white/5 backdrop-blur-sm text-white font-bold px-8 py-3.5 rounded-[8px] transition-all"
            >
              See How It Works <PlayCircle className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div variants={fadeInUp} className="flex items-center gap-3 text-sm font-medium text-[#8B949E]">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050505] bg-white/10 flex items-center justify-center text-[10px] text-[#D946EF] font-mono backdrop-blur-sm">
                  OP
                </div>
              ))}
            </div>
            <span>Trusted by security analysts in 10+ countries</span>
          </motion.div>
        </motion.div>

        {/* Right 3D Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="hidden lg:flex justify-center items-center relative"
        >
          {/* Subtle glow behind the 3D canvas */}
          <div className="absolute inset-0 bg-radial-gradient from-[#D946EF]/20 to-transparent blur-3xl opacity-50 z-0" />
          <div className="relative z-10 w-full h-[500px]">
            {!prefersReducedMotion && (
              <Suspense fallback={<div className="w-full h-full animate-pulse bg-white/5 rounded-full filter blur-xl opacity-20" />}>
                <HeroShield3D />
              </Suspense>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
