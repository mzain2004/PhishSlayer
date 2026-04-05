"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Play,
  Network,
  Star,
  Twitter,
  Linkedin,
  Github,
  ArrowRight,
  X,
} from "lucide-react";

const glassCard =
  "liquid-glass bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";

const tactileProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

function AuthModal({
  initialView,
  onClose,
}: {
  initialView: "login" | "signup";
  onClose: () => void;
}) {
  const [view, setView] = useState<"login" | "signup">(initialView);

  return (
    <div
      className={`relative w-full max-w-md p-8 ${glassCard} rounded-2xl flex flex-col`}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.button
        {...tactileProps}
        onClick={onClose}
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">
          Phish-Slayer
        </span>
      </div>

      {view === "login" ? (
        <>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Welcome back
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Log in to your account to continue
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/auth/login"
              className="w-full text-center py-2.5 rounded-lg bg-[#2DD4BF] text-black font-semibold hover:bg-[#14B8A6] transition-colors"
            >
              Continue to Login
            </Link>
            <button
              onClick={() => setView("signup")}
              className="w-full text-center py-2.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              Create account
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Create an account
          </h2>
          <p className="text-white/50 text-center mb-6 text-sm">
            Join Phish-Slayer today
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/auth/signup"
              className="w-full text-center py-2.5 rounded-lg bg-[#2DD4BF] text-black font-semibold hover:bg-[#14B8A6] transition-colors"
            >
              Continue to Signup
            </Link>
            <button
              onClick={() => setView("login")}
              className="w-full text-center py-2.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              I already have an account
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PhishSlayerLanding({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<"login" | "signup">("login");

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center text-white">
      <motion.section
        whileHover={{ filter: "drop-shadow(0 0 60px rgba(167, 139, 250, 0.15))" }}
        className="w-full max-w-5xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center transition-all duration-700"
      >
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 ${glassCard}`}
        >
          <span className="w-2 h-2 rounded-full bg-[#A78BFA] animate-pulse"></span>
          <span className="text-sm font-medium text-white/80">
            AI Threat Detection Active
          </span>
        </div>

        <motion.h1
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-space-grotesk text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight uppercase"
        >
          Neutralize threats instantly.
          <br />
          Eliminate dwell time forever.
        </motion.h1>

        <p className="text-lg md:text-xl text-white/70 max-w-3xl mb-10 leading-relaxed">
          Experience immediate, automated defense with real-time visibility,
          eliminating risks before impact.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-[#2DD4BF] text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2"
            >
              OPEN DASHBOARD
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <motion.button
              {...tactileProps}
              onClick={() => {
                setAuthIntent("signup");
                setIsAuthOpen(true);
              }}
              className="bg-[#2DD4BF] text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2 group"
            >
              ACTIVATE FREE TRIAL NOW
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.button>
          )}
          <motion.button
            {...tactileProps}
            className={`px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all flex items-center gap-2 ${glassCard}`}
          >
            <Play className="w-4 h-4" />
            WATCH DEMO
          </motion.button>
        </div>
      </motion.section>

      <section id="features" className="w-full max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 uppercase tracking-widest">
          Our Process
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: "01",
              title: "Detection",
              desc: "Scan and spot early threats with AI-powered speed.",
            },
            {
              num: "02",
              title: "Isolation",
              desc: "Contain suspicious activity automatically to prevent spread.",
            },
            {
              num: "03",
              title: "Analysis",
              desc: "Deep dive into threat behavior for actionable intel.",
            },
            {
              num: "04",
              title: "Neutralization",
              desc: "Eliminate risks and fortify your defenses.",
            },
          ].map((step) => (
            <motion.div
              key={step.num}
              {...tactileProps}
              className={`p-8 flex flex-col ${glassCard} hover:bg-white/10 transition-colors rounded-2xl`}
            >
              <span className="text-5xl font-light text-white/20 mb-6">
                {step.num}
              </span>
              <h3 className="text-2xl font-bold text-white mb-3">
                {step.title}
              </h3>
              <p className="text-white/70 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="company"
        className="w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-6 uppercase tracking-widest">
          Our Purpose
        </h2>
        <p className="text-white/70 max-w-2xl mb-16">
          To secure your digital future by eliminating threats at the source,
          creating a world where cyber safety is seamless and proactive for
          everyone.
        </p>

        <div className="relative w-full max-w-3xl aspect-[2/1] mb-12 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
          <Image
            src="https://picsum.photos/seed/team/1200/600"
            alt="Team"
            fill
            className="object-cover opacity-60 grayscale"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl relative z-20 -mt-24">
          <motion.div
            {...tactileProps}
            className={`p-8 text-left ${glassCard} rounded-2xl`}
          >
            <div className="w-10 h-10 rounded-full bg-[#A78BFA]/20 flex items-center justify-center mb-6">
              <Shield className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Our Mission</h3>
            <p className="text-white/70">
              To secure your digital future by eliminating threats at the
              source.
            </p>
          </motion.div>
          <motion.div
            {...tactileProps}
            className={`p-8 text-left ${glassCard} rounded-2xl`}
          >
            <div className="w-10 h-10 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center mb-6">
              <Network className="w-5 h-5 text-[#2DD4BF]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Our Vision</h3>
            <p className="text-white/70">
              A world where cyber safety is seamless and proactive for everyone.
            </p>
          </motion.div>
        </div>
      </section>

      <section id="pricing" className="w-full max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 uppercase tracking-widest">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <motion.div
            {...tactileProps}
            className={`p-8 ${glassCard} rounded-2xl`}
          >
            <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-white/70 mb-8 h-12">
              Get started with essential protection.
            </p>
            <button className="w-full py-3 rounded-full border border-white/20 text-white hover:bg-white/5 transition-colors font-medium">
              Get Started
            </button>
          </motion.div>

          <motion.div
            {...tactileProps}
            className={`p-8 relative transform md:-translate-y-4 border-[#2DD4BF]/50 shadow-[0_0_30px_rgba(45,212,191,0.15)] ${glassCard} rounded-2xl`}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold text-white">$20</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-white/70 mb-8 h-12">
              Advanced features for growing teams.
            </p>
            <button className="w-full py-3 rounded-full bg-[#2DD4BF] text-black transition-all duration-300 font-bold">
              Start Free Trial
            </button>
          </motion.div>

          <motion.div
            {...tactileProps}
            className={`p-8 ${glassCard} rounded-2xl`}
          >
            <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">$250</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-white/70 mb-8 h-12">
              Full scale protection and support.
            </p>
            <button className="w-full py-3 rounded-full border border-white/20 text-white hover:bg-white/5 transition-colors font-medium">
              Contact Sales
            </button>
          </motion.div>
        </div>
      </section>

      <section className="w-full max-w-7xl mx-auto px-6 py-12 mb-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-sm text-white/40">
          <p>© 2026 Phish-Slayer, Inc. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0 items-center">
            <a href="#" className="hover:text-white transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isAuthOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setIsAuthOpen(false)}
          >
            <AuthModal
              initialView={authIntent}
              onClose={() => setIsAuthOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
