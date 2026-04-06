"use client";

import { motion } from "framer-motion";
import { ArrowRight, Database, Search, Bot } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

export function GatePipeline() {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.25 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: springConfig },
  };

  const gates = [
    {
      step: 1,
      title: "Intel Vault",
      desc: "Instant local lookup. Zero API calls.",
      color: "#3FB950",
      icon: <Database className="w-8 h-8 text-[#3FB950]" strokeWidth={1.5} />,
    },
    {
      step: 2,
      title: "95-Engine Scanner",
      desc: "VirusTotal consensus across 95 engines.",
      color: "#E3B341",
      icon: <Search className="w-8 h-8 text-[#E3B341]" strokeWidth={1.5} />,
    },
    {
      step: 3,
      title: "Gemini AI",
      desc: "Plain English verdict & remediation.",
      color: "#2DD4BF",
      icon: <Bot className="w-8 h-8 text-[#2DD4BF]" strokeWidth={1.5} />,
    },
  ];

  return (
    <section className="bg-[#0A0E13] py-24 border-b border-[#1C2128] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">How It Works</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em]">
            One Scan. Three Layers. Under 30 Seconds.
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          className="flex flex-col md:flex-row items-center justify-center gap-4 relative"
        >
          {gates.map((g, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto relative z-10">
              <motion.div
                variants={itemVariants}
                className="liquid-glass p-8 rounded-[16px] w-full md:w-72 shrink-0 flex flex-col items-center text-center relative overflow-hidden hover:border-[#2DD4BF]/50 hover:shadow-[0_20px_40px_-15px_rgba(45,212,191,0.15)] hover:-translate-y-2 transition-all duration-300 ease-out"
              >
                {/* Top colored bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: g.color }} />
                
                {/* Gate number watermark */}
                <div className="absolute top-4 right-4 font-mono text-[48px] font-bold text-white/[0.04] leading-none select-none">
                  {g.step}
                </div>

                <div className="mb-6 p-4 rounded-[12px]" style={{ backgroundColor: `${g.color}15` }}>
                  {g.icon}
                </div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B949E] mb-2">
                  Gate {g.step}
                </div>
                <h3 className="text-xl font-bold text-[#E6EDF3] mb-3 tracking-tight">{g.title}</h3>
                <p className="text-[#8B949E] text-sm leading-[1.7]">{g.desc}</p>
              </motion.div>
              
              {i < gates.length - 1 && (
                <motion.div
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                  className="hidden md:flex flex-col items-center shrink-0 w-12"
                >
                  <ArrowRight className="w-8 h-8 text-[#30363D]" strokeWidth={1.5} />
                </motion.div>
              )}
              {i < gates.length - 1 && (
                <div className="md:hidden flex h-12 items-center justify-center shrink-0 w-full">
                  <ArrowRight className="w-8 h-8 text-[#30363D] rotate-90" strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Output Example Card */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ ...springConfig, delay: 0.5 }}
          className="mt-20 max-w-3xl mx-auto liquid-glass rounded-[16px] p-6 font-mono text-sm relative"
        >
          <div className="absolute -top-3 left-6 px-3 bg-[#0A0E13] border border-white/10 text-[#8B949E] font-mono text-[10px] font-bold rounded-full uppercase tracking-[0.12em]">
            Pipeline Output
          </div>
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#F85149] animate-pulse shadow-[0_0_10px_rgba(248,81,73,0.6)]" />
              <span className="text-[#F85149] font-bold">VERDICT: MALICIOUS</span>
            </div>
            <div className="text-[#E6EDF3]">
              Risk Score: <span className="text-[#F85149] font-black text-lg">94</span>/100
            </div>
          </div>
          <div className="text-[#8B949E] space-y-2">
            <p>1. Local Vault Match: None</p>
            <p className="text-[#E6EDF3]"><span className="text-[#E3B341]">2. Signatures:</span> 12/95 engines flagged as dropping malware (Trojan.Generic).</p>
            <p className="text-[#2DD4BF]"><span className="text-[#E6EDF3]">3. AI Analysis:</span> Domain mimics Microsoft login page. Form action payload exfiltrates credentials to off-shore IP. High probability credential harvester.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

