"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const springConfig = {
  type: "spring" as const,
  stiffness: 60,
  damping: 25,
  bounce: 0.1,
};

export function AdaptiveAIVision() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      setError("Please enter a valid email address.");
      setFeedback(null);
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      if (!res.ok) {
        throw new Error("waitlist_request_failed");
      }

      setFeedback("You're on the list! We'll be in touch. ðŸš€");
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#0A0E13] py-24 border-b border-[#1C2128] overflow-hidden text-[#E6EDF3]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={springConfig}
            className="inline-block bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] font-mono text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.12em] mb-6"
          >
            In Development â€” Q3 2026
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={springConfig}
            className="text-3xl md:text-5xl font-bold tracking-[-0.01em]"
          >
            The Next Phase â€” AI That Fights Back
          </motion.h2>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.25 } },
          }}
          className="grid md:grid-cols-2 gap-8 md:gap-16 items-center relative mb-20"
        >
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#0A0E13] border-4 border-white/10 rounded-full items-center justify-center font-black text-xl text-[#8B949E] z-10 shadow-2xl">
            VS
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0, x: -50 },
              visible: { opacity: 1, x: 0, transition: springConfig },
            }}
            className="bg-black border border-[#F85149]/30 rounded-[16px] p-8 relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(248,81,73,0.15)]"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#F85149] block mb-4">
              The Problem
            </span>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">
              Adaptive Malware
            </h3>
            <p className="text-[#8B949E] leading-[1.7] mb-6 text-[16px]">
              Modern malware uses LLMs to rewrite its own source code on the
              fly. Signatures change every 3 seconds. Static detection rules are
              obsolete before they&apos;re even deployed.
            </p>
            <div className="font-mono text-xs bg-[#0D1117] p-3 rounded-[8px] border border-white/10 text-[#F85149] opacity-80">
              <span className="font-bold">&gt; Mutation cycle 284:</span>{" "}
              payload obfuscated.
              <br />
              <span className="font-bold">&gt; Hash:</span> e3b0c44298fc1c14...
              <br />
              <span className="font-bold">&gt; Status:</span> Undetected by
              94/95 vendors.
            </div>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, x: 50 },
              visible: { opacity: 1, x: 0, transition: springConfig },
            }}
            className="bg-black border border-[#2DD4BF]/30 rounded-[16px] p-8 relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(45,212,191,0.15)]"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#2DD4BF] block mb-4">
              The Solution
            </span>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">
              Continuous EDR Synthesis
            </h3>
            <p className="text-[#8B949E] leading-[1.7] mb-6 text-[16px]">
              Our upcoming engine observes live behavioral drift. As malware
              mutates, Phish-Slayer AI synthesizes and deploys
              counter-heuristics to your entire agent fleet in milliseconds.
            </p>
            <div className="font-mono text-xs bg-[#0D1117] p-3 rounded-[8px] border border-[#2DD4BF]/20 text-[#2DD4BF]">
              <span className="font-bold">&gt; Pattern observed:</span> Process
              injection variant detected.
              <br />
              <span className="font-bold">&gt; Synthesizing rule...</span>
              <br />
              <span className="font-bold">
                &gt; Deployed to 4,000 agents.
              </span>{" "}
              Latency: 42ms.
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="max-w-xl mx-auto text-center"
        >
          <h3 className="text-lg font-bold mb-4">
            Be the first to know when Adaptive Defense drops.
          </h3>
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="security@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 liquid-glass rounded-full px-6 py-3 text-sm font-mono focus:outline-none focus:border-[#2DD4BF] transition-colors"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#2DD4BF] text-[#0D1117] font-bold px-8 py-3 rounded-full text-sm hover:bg-[#14B8A6] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Get Early Access"}
            </button>
          </form>
          {feedback && (
            <p className="mt-3 text-sm text-[#2DD4BF]">{feedback}</p>
          )}
          {error && <p className="mt-3 text-sm text-[#F85149]">{error}</p>}
        </motion.div>
      </div>
    </section>
  );
}

