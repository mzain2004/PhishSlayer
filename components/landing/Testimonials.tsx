"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

export function Testimonials() {
  const testimonials = [
    {
      quote: "Phish-Slayer's API integrated into our Sentinel workflow in under 20 minutes. The plain-English AI verdicts have cut our junior analysts' triage time by 75%.",
      name: "Marcus T.",
      role: "Lead Security Engineer",
      initial: "M",
    },
    {
      quote: "Every other EDR platform we demoed required a $30,000 upfront commitment and a 3-month deployment cycle. We deployed 40 Phish-Slayer agents in one afternoon for $49.",
      name: "Sarah C.",
      role: "vCISO at MSP Group",
      initial: "S",
    },
    {
      quote: "The 3-gate pipeline caught a zero-day credential harvesting campaign targeting our CFO via SMS links. Tools costing 50x more missed it completely.",
      name: "David K.",
      role: "Director of IT",
      initial: "D",
    }
  ];

  return (
    <section className="bg-[#0D1117] py-24 border-b border-[#1C2128]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">Testimonials</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em]">
            What Security Professionals Are Saying
          </h2>
          <p className="text-[#8B949E] mt-4 font-mono text-[12px] tracking-[0.1em] uppercase">(Early Feedback Cohort)</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.25 } } }}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 80 }, visible: { opacity: 1, y: 0, transition: springConfig } }}
              className="liquid-glass rounded-[16px] p-8 flex flex-col hover:border-[#2DD4BF]/50 hover:shadow-[0_20px_40px_-15px_rgba(45,212,191,0.15)] hover:-translate-y-2 transition-all duration-300 ease-out"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-5 h-5 text-[#E3B341] fill-[#E3B341]" strokeWidth={1.5} />
                ))}
              </div>
              
              <p className="text-[#E6EDF3] leading-[1.7] mb-8 flex-1 text-[16px]">
                &quot;{t.quote}&quot;
              </p>
              
              <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                <div className="w-12 h-12 bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 rounded-full flex items-center justify-center text-[#2DD4BF] font-bold text-lg">
                  {t.initial}
                </div>
                <div>
                  <h4 className="text-[#E6EDF3] font-bold">{t.name}</h4>
                  <p className="text-[#8B949E] font-mono text-[10px] uppercase tracking-[0.12em]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

