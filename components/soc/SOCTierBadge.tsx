"use client";

import { motion } from "framer-motion";

type Props = {
  tier: 0 | 0.5 | 1 | 2 | 3;
};

const tierConfig: Record<
  Props["tier"],
  { label: string; classes: string; glow: string }
> = {
  0: {
    label: "TIER 0 — AUTOMATED PREVENTION",
    classes: "text-slate-200 border-slate-400/40 bg-slate-600/20",
    glow: "0 0 20px rgba(148,163,184,0.35)",
  },
  0.5: {
    label: "TIER 0.5 — DETECTION ONLY",
    classes: "text-slate-200 border-slate-400/40 bg-slate-600/20",
    glow: "0 0 20px rgba(148,163,184,0.35)",
  },
  1: {
    label: "TIER 1 — AUTONOMOUS TRIAGE",
    classes: "text-sky-200 border-sky-400/50 bg-sky-500/15",
    glow: "0 0 24px rgba(56,189,248,0.45)",
  },
  2: {
    label: "TIER 2 — AUTONOMOUS RESPONSE",
    classes: "text-orange-200 border-orange-400/50 bg-orange-500/15",
    glow: "0 0 24px rgba(251,146,60,0.45)",
  },
  3: {
    label: "TIER 3 — THREAT HUNTING",
    classes: "text-red-200 border-red-400/50 bg-red-500/15",
    glow: "0 0 24px rgba(248,113,113,0.5)",
  },
};

export default function SOCTierBadge({ tier }: Props) {
  const config = tierConfig[tier];

  return (
    <motion.div
      animate={{
        boxShadow: ["0 0 0 rgba(0,0,0,0)", config.glow, "0 0 0 rgba(0,0,0,0)"],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold tracking-[0.16em] uppercase border bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl ${config.classes}`}
    >
      {config.label}
    </motion.div>
  );
}
