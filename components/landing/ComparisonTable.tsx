"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

export function ComparisonTable() {
  const rows = [
    { feature: "AI Analysis", ps: "Gemini AI", rf: false, tc: false },
    { feature: "EDR Agent", ps: "Full WebSocket", rf: false, tc: false },
    { feature: "Fleet Management", ps: "Live Dashboard", rf: false, tc: false },
    { feature: "Free Tier", ps: "10 scans/day", rf: false, tc: false },
    { feature: "Adaptive AI", ps: "In Dev", rf: false, tc: false },
  ];

  const springConfig = { type: "spring" as const, stiffness: 100, damping: 20 };

  return (
    <section className="bg-[#050505] py-32 border-b border-white/10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            No Competitor Offers This at This Price
          </h2>
        </motion.div>

        {/* Grid Based Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={springConfig}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {/* Column 1: Features */}
          <div className="hidden md:flex flex-col justify-end gap-6 pb-6 pr-4">
            {rows.map((row, i) => (
              <div key={i} className="h-10 text-white/50 font-bold uppercase tracking-wider text-sm flex items-center">
                {row.feature}
              </div>
            ))}
            <div className="h-16 text-white font-black text-lg pt-4 flex items-center">
              Starting Price
            </div>
          </div>

          {/* Column 2: Phish-Slayer (Glowing Glass Card) */}
          <div className="flex flex-col gap-6 bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Phish-Slayer
            </div>
            
            <div className="md:hidden space-y-2 mb-4 mt-2">
              <h3 className="text-xl font-bold text-[#8B5CF6] text-center">Phish-Slayer</h3>
            </div>
            
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/10 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-white/50 font-bold uppercase text-xs">{row.feature}</span>
                <span className="text-[#8B5CF6] font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> {row.ps}
                </span>
              </div>
            ))}
            
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/10">
              <span className="md:hidden text-white font-bold">Price</span>
              <div className="text-center">
                <span className="text-white text-3xl font-black">$49</span>
                <span className="text-white/50 text-sm">/mo</span>
              </div>
            </div>
          </div>

          {/* Column 3: Recorded Future */}
          <div className="flex flex-col gap-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6 opacity-50 hover:opacity-100 transition-opacity">
            <div className="text-center text-white/70 font-bold mb-2">Recorded Future</div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/5 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-white/50 text-xs">{row.feature}</span>
                <X className="w-5 h-5 text-red-500/50" />
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/5">
              <span className="md:hidden text-white">Price</span>
              <span className="text-white/80 font-bold">$25,000<span className="text-xs">/yr</span></span>
            </div>
          </div>

          {/* Column 4: ThreatConnect */}
          <div className="flex flex-col gap-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6 opacity-50 hover:opacity-100 transition-opacity">
            <div className="text-center text-white/70 font-bold mb-2">ThreatConnect</div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/5 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-white/50 text-xs">{row.feature}</span>
                <X className="w-5 h-5 text-red-500/50" />
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/5">
              <span className="md:hidden text-white">Price</span>
              <span className="text-white/80 font-bold">$50,000<span className="text-xs">/yr</span></span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
