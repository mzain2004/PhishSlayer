"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

export function ComparisonTable() {
  const rows = [
    { feature: "AI Analysis", ps: "Gemini AI", rf: false, tc: false },
    { feature: "EDR Agent", ps: "Full WebSocket", rf: false, tc: false },
    { feature: "Fleet Management", ps: "Live Dashboard", rf: false, tc: false },
    { feature: "Free Tier", ps: "10 scans/day", rf: false, tc: false },
    { feature: "Adaptive AI", ps: "In Dev", rf: false, tc: false },
  ];

  return (
    <section className="bg-[#050507] py-32 border-b border-white/5 overflow-hidden antialiased">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight antialiased">
            No Competitor Offers This at This Price
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={springConfig}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {/* Column 1: Features */}
          <div className="hidden md:flex flex-col justify-end gap-6 pb-6 pr-4">
            {rows.map((row, i) => (
              <div key={i} className="h-10 text-slate-500 font-bold uppercase tracking-wider text-sm flex items-center antialiased">
                {row.feature}
              </div>
            ))}
            <div className="h-16 text-white font-black text-lg pt-4 flex items-center tracking-tight antialiased">
              Starting Price
            </div>
          </div>

          {/* Column 2: Phish-Slayer */}
          <div className="flex flex-col gap-6 bg-slate-900/40 backdrop-blur-2xl border border-teal-500/30 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Phish-Slayer
            </div>
            
            <div className="md:hidden space-y-2 mb-4 mt-2">
              <h3 className="text-xl font-bold text-teal-400 text-center tracking-tight antialiased">Phish-Slayer</h3>
            </div>
            
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/5 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-slate-500 font-bold uppercase text-xs antialiased">{row.feature}</span>
                <span className="text-teal-400 font-bold flex items-center gap-2 antialiased">
                  <Check className="w-4 h-4" strokeWidth={1.5} /> {row.ps}
                </span>
              </div>
            ))}
            
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/5">
              <span className="md:hidden text-white font-bold antialiased">Price</span>
              <div className="text-center">
                <span className="text-white text-3xl font-black tracking-tight antialiased">$49</span>
                <span className="text-slate-500 text-sm">/mo</span>
              </div>
            </div>
          </div>

          {/* Column 3: Recorded Future */}
          <div className="flex flex-col gap-6 bg-slate-900/40 border border-white/5 rounded-2xl p-6 opacity-50 hover:opacity-100 transition-opacity duration-300">
            <div className="text-center text-slate-400 font-bold mb-2 antialiased">Recorded Future</div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/5 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-slate-500 text-xs antialiased">{row.feature}</span>
                <X className="w-5 h-5 text-red-500/50" strokeWidth={1.5} />
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/5">
              <span className="md:hidden text-white antialiased">Price</span>
              <span className="text-slate-300 font-bold antialiased">$25,000<span className="text-xs">/yr</span></span>
            </div>
          </div>

          {/* Column 4: ThreatConnect */}
          <div className="flex flex-col gap-6 bg-slate-900/40 border border-white/5 rounded-2xl p-6 opacity-50 hover:opacity-100 transition-opacity duration-300">
            <div className="text-center text-slate-400 font-bold mb-2 antialiased">ThreatConnect</div>
            {rows.map((row, i) => (
              <div key={i} className="h-10 flex items-center justify-between md:justify-center border-b border-white/5 md:border-none pb-2 md:pb-0">
                <span className="md:hidden text-slate-500 text-xs antialiased">{row.feature}</span>
                <X className="w-5 h-5 text-red-500/50" strokeWidth={1.5} />
              </div>
            ))}
            <div className="h-16 flex items-center justify-between md:justify-center pt-4 md:border-t border-white/5">
              <span className="md:hidden text-white antialiased">Price</span>
              <span className="text-slate-300 font-bold antialiased">$50,000<span className="text-xs">/yr</span></span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
