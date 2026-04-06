"use client";

import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

export function ComparisonTable() {
  const rows = [
    { feature: "AI Analysis", ps: "Gemini AI", rf: "Basic", tc: "Manual" },
    { feature: "EDR Agent", ps: "Full WebSocket", rf: "None", tc: "None" },
    { feature: "Fleet Management", ps: "Live Dashboard", rf: "Portal Only", tc: "SIEM Required" },
    { feature: "Free Tier", ps: "10 scans/day", rf: "None", tc: "None" },
    { feature: "Adaptive AI", ps: "In Dev", rf: "Roadmap", tc: "Roadmap" },
  ];

  return (
    <section className="bg-[#0A0E13] py-24 border-b border-[#1C2128] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">Comparison</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em]">
            Uncompromising Architecture. Unmatched ROI.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {/* Labels */}
          <div className="hidden md:flex flex-col justify-end gap-6 pb-12 pr-4">
            {rows.map((row, i) => (
              <div key={i} className="h-10 text-[#8B949E] font-bold uppercase tracking-wider flex items-center font-mono text-[12px] tracking-[0.12em]">
                {row.feature}
              </div>
            ))}
            <div className="h-16 text-[#E6EDF3] font-extrabold text-lg flex items-center tracking-tight border-t border-white/10 mt-4">
              Starting Price
            </div>
          </div>

          {/* Phish-Slayer */}
          <div className="flex flex-col gap-6 bg-teal-900/20 backdrop-blur-xl border border-teal-500/50 rounded-2xl p-6 relative z-10 shadow-[0_0_40px_rgba(45,212,191,0.15)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#0D1117] font-mono text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(45,212,191,0.5)] whitespace-nowrap">
              Best Value: Phish-Slayer
            </div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/10 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-[#8B949E] font-bold uppercase text-xs font-mono">{row.feature}</span>
                <span className="text-teal-400 font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} /> {row.ps}
                </span>
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/10 mt-4">
              <span className="md:hidden text-[#E6EDF3] font-bold">Price</span>
              <div className="text-center">
                <span className="text-[#E6EDF3] text-3xl font-extrabold tracking-tight">$49</span>
                <span className="text-[#8B949E] text-sm">/mo</span>
              </div>
            </div>
          </div>

          {/* Competitor 1 */}
          <div className="flex flex-col gap-6 bg-black/30 border border-slate-800 rounded-2xl p-6 transition-all duration-300">
            <div className="text-center text-[#8B949E] font-bold mb-2">Recorded Future</div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/10 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-[#8B949E] font-bold uppercase text-xs font-mono">{row.feature}</span>
                <span className="text-[#8B949E] flex items-center gap-2 text-sm">
                   <Minus className="w-4 h-4 text-slate-600" /> {row.rf}
                </span>
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-slate-800 mt-4">
              <span className="md:hidden text-[#8B949E] font-bold">Price</span>
              <span className="text-[#8B949E] font-bold">$25,000<span className="text-xs">/yr</span></span>
            </div>
          </div>

          {/* Competitor 2 */}
          <div className="flex flex-col gap-6 bg-black/30 border border-slate-800 rounded-2xl p-6 transition-all duration-300">
            <div className="text-center text-[#8B949E] font-bold mb-2">ThreatConnect</div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/10 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-[#8B949E] font-bold uppercase text-xs font-mono">{row.feature}</span>
                <span className="text-[#8B949E] flex items-center gap-2 text-sm">
                   <X className="w-4 h-4 text-slate-600" /> {row.tc}
                </span>
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-slate-800 mt-4">
              <span className="md:hidden text-[#8B949E] font-bold">Price</span>
              <span className="text-[#8B949E] font-bold">$50,000<span className="text-xs">/yr</span></span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

