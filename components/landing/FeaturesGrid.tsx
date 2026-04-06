"use client";

import { motion } from "framer-motion";
import { Shield, Cpu, Monitor, Bell, FileText, Code } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

const features = [
  { icon: <Cpu className="w-6 h-6" strokeWidth={1.5} />, label: "AI Engine", title: "AI Threat Analysis", desc: "Gemini-powered plain English verdicts breaking down complex malware behavior." },
  { icon: <Shield className="w-6 h-6" strokeWidth={1.5} />, label: "Detection", title: "95-Engine Scanner", desc: "VirusTotal cross-reference on every scan to ensure maximum detection rates." },
  { icon: <Monitor className="w-6 h-6" strokeWidth={1.5} />, label: "Monitoring", title: "EDR Fleet Monitor", desc: "Real-time endpoint telemetry dashboard for your entire organization's fleet." },
  { icon: <Bell className="w-6 h-6" strokeWidth={1.5} />, label: "Alerting", title: "Discord Alerts", desc: "Instant webhooks hitting your team's channels on every malicious finding." },
  { icon: <FileText className="w-6 h-6" strokeWidth={1.5} />, label: "Reporting", title: "Executive PDF Reports", desc: "One-click branded export tailored for leadership and compliance auditing." },
  { icon: <Code className="w-6 h-6" strokeWidth={1.5} />, label: "Integration", title: "Public REST API", desc: "Integrate directly into your existing SIEM or SOAR via /api/v1/scan endpoint." },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-[#0D1117] py-24 border-b border-[#1C2128] overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">Capabilities</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em]">
            Everything Your SOC Team Needs.<br />Nothing It Doesn&apos;t.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.25 } } }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 80 }, visible: { opacity: 1, y: 0, transition: springConfig } }}
              className="liquid-glass p-6 rounded-[16px] transition-all duration-300 ease-out group hover:border-[#2DD4BF]/50 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(45,212,191,0.15)]"
            >
              <span className="font-mono text-[10px] tracking-[0.12em] text-[#2DD4BF] uppercase block mb-2">{feature.label}</span>
              <div className="w-12 h-12 bg-[#0D1117] border border-white/10 rounded-[8px] flex items-center justify-center text-[#2DD4BF] mb-4 group-hover:border-[#2DD4BF]/30 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-[#E6EDF3] mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-[#8B949E] leading-[1.7] text-[16px]">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

