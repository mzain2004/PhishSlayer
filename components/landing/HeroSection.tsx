"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { ParticleNetwork } from "@/components/ui/particle-network";
import ShieldIcon from "@/components/ui/shield-icon";

const springConfig = {
  type: "spring" as const,
  stiffness: 60,
  damping: 25,
  bounce: 0.1,
};

const fadeInUp = {
  hidden: { opacity: 0, y: 80 },
  visible: { opacity: 1, y: 0, transition: springConfig },
};

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden bg-base">
      <ParticleNetwork disabled={!!prefersReducedMotion} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center w-full text-center">
        {/* Shield Icon Replacement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ ...springConfig, delay: 0.1 }}
        >
          <ShieldIcon />
        </motion.div>

        {/* Content */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.25 } },
          }}
          className="max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="mb-8 inline-flex">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-[4px] px-3.5 py-1.5 font-mono text-[11px] tracking-[0.1em] text-primary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              ADAPTIVE AI DEFENSE - IN DEVELOPMENT
            </div>
          </motion.div>

          {/* H1 - Price Contrast Headline */}
          <motion.h1 variants={fadeInUp} className="mb-6">
            <span className="block text-[40px] lg:text-[72px] font-extrabold text-[#E6EDF3] leading-[1.1] tracking-[-0.02em]">
              Enterprise Threat Intelligence.
            </span>
            <span className="block text-[40px] lg:text-[72px] font-extrabold text-primary leading-[1.1] tracking-[-0.02em]">
              Scaled for Your Team.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={fadeInUp}
            className="text-[16px] text-[#8B949E] mb-8 leading-[1.7] max-w-2xl mx-auto"
          >
            Deploy military-grade EDR starting at $1,499/month or $17,988/year.
            Uncompromising security without the legacy enterprise bloat.
          </motion.p>

          {/* Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-10"
          >
            <Link
              href="/auth/signup"
              className="inline-flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-[15px] px-8 py-3 rounded-full tracking-[0.01em] transition-all hover:-translate-y-[1px] hover:shadow-[0_12px_30px_rgba(124,106,247,0.35)]"
            >
              Deploy Your First Agent Free
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/#features"
              className="inline-flex justify-center items-center gap-2 bg-transparent border border-white/10 hover:border-accent text-[#E6EDF3] hover:text-accent font-bold text-[15px] px-10 py-4 rounded-full transition-all"
            >
              See How It Works
              <PlayCircle className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            variants={fadeInUp}
            className="flex items-center justify-center gap-0"
          >
            {[
              { value: "30 sec", label: "verdict time" },
              { value: "95", label: "scan engines" },
              { value: "$0", label: "to start" },
            ].map((stat, i) => (
              <div
                key={i}
                className={`flex flex-col items-center px-6 ${i > 0 ? "border-l border-white/10" : ""}`}
              >
                <span className="text-[28px] font-bold text-[#E6EDF3] tracking-tight">
                  {stat.value}
                </span>
                <span className="text-[12px] font-mono text-[#8B949E] uppercase tracking-[0.15em]">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
