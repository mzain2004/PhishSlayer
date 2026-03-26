"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Zap, ShieldX } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

const fadeInUp = {
  hidden: { opacity: 0, y: 80 },
  visible: { opacity: 1, y: 0, transition: springConfig }
};

export function ProblemStatement() {
  return (
    <section className="bg-[#0D1117] py-24 border-b border-[#1C2128]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">The Problem</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em]">
            Enterprise Security Tools Are Priced to Exclude You
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.25 } } }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          {[
            { 
              title: "Financial Barrier", 
              icon: AlertTriangle,
              desc: "Recorded Future $25K/year. ThreatConnect $50K/year. Most teams are forced to fly blind." 
            },
            { 
              title: "Polymorphic Threats", 
              icon: Zap,
              desc: "Malware rewrites its own code in real time. Static signatures and legacy tools are now obsolete." 
            },
            { 
              title: "Intelligence Silos", 
              icon: ShieldX,
              desc: "Security teams context-switch between 5-8 platforms. Critical minutes are lost per incident." 
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="group relative bg-[#161B22] border border-[#30363D] p-8 rounded-[16px] overflow-hidden hover:border-[#2DD4BF]/50 hover:shadow-[0_20px_40px_-15px_rgba(45,212,191,0.15)] hover:-translate-y-2 transition-all duration-300 ease-out"
            >
              {/* Top highlight gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F85149] to-transparent opacity-50 group-hover:via-[#2DD4BF] transition-all" />
              
              <div className="relative z-10">
                <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-[12px] bg-[#F85149]/10 border border-[#F85149]/20 group-hover:bg-[#2DD4BF]/10 group-hover:border-[#2DD4BF]/20 transition-all">
                  <card.icon className="w-6 h-6 text-[#F85149] group-hover:text-[#2DD4BF] transition-all" strokeWidth={1.5} />
                </div>
                
                <h3 className="text-xl font-bold text-[#E6EDF3] mb-4 tracking-tight group-hover:text-[#2DD4BF] transition-colors">{card.title}</h3>
                <p className="text-[#8B949E] leading-[1.7] text-[15px]">{card.desc}</p>
              </div>

              {/* Watermark-style number */}
              <div className="absolute -bottom-6 -right-6 text-[120px] font-extrabold text-[#E6EDF3]/[0.02] select-none">
                0{i + 1}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 border border-[#30363D] bg-[#161B22]/50 backdrop-blur-sm rounded-[16px]"
        >
          <div className="text-center px-4">
            <p className="text-4xl font-extrabold text-[#E6EDF3] mb-1 tracking-tight">207</p>
            <p className="text-[12px] font-mono text-[#8B949E] uppercase tracking-[0.12em]">Days avg breach detection time</p>
          </div>
          <div className="text-center px-4 md:border-x md:border-[#30363D]">
            <p className="text-4xl font-extrabold text-[#E6EDF3] mb-1 tracking-tight">43%</p>
            <p className="text-[12px] font-mono text-[#8B949E] uppercase tracking-[0.12em]">Of attacks target SMBs</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-extrabold text-[#E6EDF3] mb-1 tracking-tight">3.5M</p>
            <p className="text-[12px] font-mono text-[#8B949E] uppercase tracking-[0.12em]">Unfilled security jobs</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
