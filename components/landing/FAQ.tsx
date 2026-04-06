"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: "Is the free tier actually free forever?", a: "Yes. The Recon tier allows 10 scans per day, 1 active EDR agent, and basic Discord alerts at no cost. We don't require a credit card to sign up, and we won't bait-and-switch you." },
    { q: "How does the 3-gate scan pipeline work?", a: "Gate 1 checks our proprietary Intel Vault of known malicious signatures for instant blocks. Gate 2 queries 95 separate antivirus engines via VirusTotal. Finally, Gate 3 feeds the DOM, SSL, and network payload into Gemini AI for behavioral analysis and intent detection." },
    { q: "What does the EDR agent actually monitor?", a: "Our lightweight Rust-based agent streams active processes, outbound network connections, and critical file system changes via WebSocket directly to your dashboard. It operates in user-space with negligible CPU overhead." },
    { q: "Is my scan data private and secure?", a: "Absolutely. Phish-Slayer is currently undergoing SOC 2 Type I compliance. We encrypt all telemetry data at rest (AES-256) and in transit (TLS 1.3). Private URLs scanned by Enterprise clients are never shared with external vendors." },
    { q: "Do you offer API access for SIEM integration?", a: "Yes. Both the SOC Pro and Command & Control tiers include access to `/api/v1/scan`. You can route alerts via webhook directly into Splunk, Microsoft Sentinel, or any compliant SIEM." },
    { q: "What happens when my daily scan limit is reached?", a: "The dashboard will notify you that your quota is exhausted. Scans will be paused until the daily reset (midnight UTC). You can upgrade instantly to SOC Pro ($49/mo) to unlock 500 scans per day." },
    { q: "How is this different from just using VirusTotal?", a: "VirusTotal is a static signature aggregator (Gate 2 of our pipeline). It fails against zero-day phishing kits and polymorphic malware. We combine VT's raw data with our local intel and Gemini's behavioral LLM reasoning to catch threats that bypass traditional AV." }
  ];

  return (
    <section className="bg-[#0A0E13] py-24 border-b border-[#1C2128]">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">FAQ</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em]">
            Questions We Get Asked
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ ...springConfig, delay: 0.2 }}
          className="space-y-4"
        >
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`border rounded-2xl transition-all duration-200 ease-out hover:bg-slate-800/50 ${openIndex === i ? "bg-black/60 backdrop-blur-md border-white/10 shadow-[0_10px_30px_-10px_rgba(45,212,191,0.1)]" : "bg-black/40 backdrop-blur-md border-white/5"}`}
            >
              <button
                className="w-full flex items-center justify-between p-6 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-bold text-[#E6EDF3] text-lg tracking-tight">{faq.q}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-[#2DD4BF] transition-transform duration-300 shrink-0 ml-4 ${openIndex === i ? "rotate-180" : ""}`}
                  strokeWidth={1.5}
                />
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-[#8B949E] leading-[1.7] text-[16px]">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

