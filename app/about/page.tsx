"use client";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { ParticleNetwork } from "@/components/ui/particle-network";

export default function AboutPage() {
  return (
    <div className="bg-[#0D1117] text-[#E6EDF3] font-sans min-h-screen">
      <Header />
      
      <main className="pt-24">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-32 border-b border-white/10">
          <div className="absolute inset-0 z-0 opacity-30">
            <ParticleNetwork disabled={false} />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
              className="text-4xl md:text-6xl font-black text-[#E6EDF3] tracking-tight mb-6"
            >
              Built by a Builder.<br className="hidden md:block" /> For People Who Defend.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-[#8B949E] max-w-3xl mx-auto mb-16 leading-relaxed"
            >
              Phish-Slayer was built out of frustration. Every useful security tool cost more than most companies&apos; entire IT budget. So we built the alternative.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 liquid-glass rounded-[12px] p-8"
            >
              {[
                { val: "$0", label: "Funding Raised", color: "text-[#2DD4BF]" },
                { val: "1", label: "Founder", color: "text-[#E6EDF3]" },
                { val: "6", label: "Months to Prod", color: "text-[#E6EDF3]" },
                { val: "Live", label: "phishslayer.tech", color: "text-[#3FB950]" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className={`text-3xl font-black ${s.color} mb-1`}>{s.val}</div>
                  <div className="text-[10px] text-[#8B949E] uppercase tracking-widest font-bold">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FOUNDER STORY */}
        <section className="py-24 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#2DD4BF]/5 blur-2xl rounded-full" />
              <div className="aspect-square bg-[#1C2128] border border-white/10 rounded-[12px] overflow-hidden relative z-10 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-32 h-32 bg-[#0D1117] border border-white/10 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl text-[#2DD4BF] font-black">
                    MZ
                  </div>
                  <div className="font-mono text-[#8B949E] text-xs space-y-2">
                    <p>&gt; Author: Muhammad Zain</p>
                    <p>&gt; Background: Self-Taught</p>
                    <p>&gt; Location: Bahawalpur, PK</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#E6EDF3] mb-6">The Origin</h2>
              <div className="space-y-6 text-[#8B949E] leading-relaxed">
                <p>
                  At 19 years old, working completely solo from Pakistan, I noticed a massive gap in the cybersecurity landscape. 
                  The tools required to actively defend against modern phishing and malware campaigns were locked behind 
                  "Contact Sales" buttons leading to $50,000 annual contracts.
                </p>
                <p>
                  Small-to-medium businesses, educational institutions, and independent researchers were priced out of good security. 
                  I spent 6 months building Phish-Slayer from the ground up to solve this exact problem â€” combining deep local intel 
                  scanning with live EDR telemetry and LLM behavioral reasoning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="py-32 bg-black border-b border-white/10">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-black text-[#E6EDF3] mb-12">Our Mission</h2>
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#E6EDF3] leading-tight mb-20 italic">
              &quot;Enterprise-grade threat intelligence should not be a privilege of companies that can afford $25,000/year contracts. Every security team deserves the same quality of defense.&quot;
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              {[
                { title: "Accessibility", desc: "No opaque pricing. No mandatory sales calls. Transparent tiers starting at a price independent security researchers can actually afford." },
                { title: "Transparency", desc: "Our scanning pipeline produces clear, verifiable results. No magic black boxes â€” we show you exactly why a verdict was reached." },
                { title: "Speed", desc: "A dashboard designed for efficiency. Every UI component is built to help SOC analysts make critical decisions in seconds, not hours." }
              ].map((value, i) => (
                <div key={i} className="bg-[#0D1117] border border-white/10 p-8 rounded-[12px]">
                  <h3 className="text-xl font-bold text-[#2DD4BF] mb-3">{value.title}</h3>
                  <p className="text-[#8B949E] text-sm leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section className="py-24 border-b border-white/10">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-black text-[#E6EDF3] mb-12">What Phish-Slayer Is Built On</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {["Next.js", "TypeScript", "Supabase", "Azure", "Nginx", "Google Gemini", "VirusTotal", "Paddle"].map((tech, i) => (
                <div key={i} className="px-6 py-3 liquid-glass rounded-full text-[#8B949E] font-bold text-sm tracking-wide">
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="py-32 bg-[#0D1117] border-b border-white/10">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-black text-[#E6EDF3] mb-16 text-center">Where We Are Going</h2>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#30363D]">
              {[
                { q: "Q1 2026", title: "Platform Live", status: "complete", desc: "V1 launched with 3-gate pipeline and fleet EDR support." },
                { q: "Q2 2026", title: "Payments & SOC Pro", status: "complete", desc: "Paddle billing integration and premium tier rollout." },
                { q: "Q3 2026", title: "Adaptive AI Engine", status: "pending", desc: "Real-time behavioral synthesis and defense rules deployed dynamically to fleet." },
                { q: "Q4 2026", title: "Series A & Scale", status: "pending", desc: "Scale infrastructure globally to support Enterprise SLAs." }
              ].map((item, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0D1117] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                    item.status === "complete" ? "bg-[#2DD4BF]" : "bg-[#1C2128]"
                  }`}>
                    {item.status === "complete" && <svg className="w-4 h-4 text-[#0D1117] fill-current" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" /></svg>}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-black p-6 rounded-[12px] border border-white/10 shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-[#E6EDF3]">{item.title}</div>
                      <div className={`text-xs font-bold uppercase tracking-wider ${item.status === "complete" ? "text-[#2DD4BF]" : "text-[#A78BFA]"}`}>
                        {item.q}
                      </div>
                    </div>
                    <div className="text-[#8B949E] text-sm leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

