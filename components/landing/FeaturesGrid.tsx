"use client";

import { motion } from "framer-motion";
import { Shield, Cpu, Monitor, Bell, FileText, Code } from "lucide-react";

const features = [
  {
    icon: <Cpu className="w-6 h-6" />,
    title: "AI Threat Analysis",
    desc: "Gemini-powered plain English verdicts breaking down complex malware behavior.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "95-Engine Scanner",
    desc: "VirusTotal cross-reference on every scan to ensure maximum detection rates.",
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "EDR Fleet Monitor",
    desc: "Real-time endpoint telemetry dashboard for your entire organization's fleet.",
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: "Discord Alerts",
    desc: "Instant webhooks hitting your team's channels on every malicious finding.",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Executive PDF Reports",
    desc: "One-click branded export tailored for leadership and compliance auditing.",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Public REST API",
    desc: "Integrate directly into your existing SIEM or SOAR via /api/v1/scan endpoint.",
  }
];

export function FeaturesGrid() {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } }
  };

  return (
    <section id="features" className="bg-[#050505] py-32 border-b border-white/10 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Everything Your SOC Team Needs.<br />Nothing It Doesn&apos;t.
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ 
                y: -4, 
                borderColor: "rgba(255,255,255,0.2)"
              }}
              className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] p-8 rounded-2xl transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[8px] flex items-center justify-center text-[#8B5CF6] mb-6 transition-all">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-[#8B949E] leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
