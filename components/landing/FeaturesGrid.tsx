"use client";

import { motion } from "framer-motion";
import { Shield, Cpu, Monitor, Bell, FileText, Code } from "lucide-react";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

const features = [
  {
    icon: <Cpu className="w-6 h-6" strokeWidth={1.5} />,
    title: "AI Threat Analysis",
    desc: "Gemini-powered plain English verdicts breaking down complex malware behavior.",
  },
  {
    icon: <Shield className="w-6 h-6" strokeWidth={1.5} />,
    title: "95-Engine Scanner",
    desc: "VirusTotal cross-reference on every scan to ensure maximum detection rates.",
  },
  {
    icon: <Monitor className="w-6 h-6" strokeWidth={1.5} />,
    title: "EDR Fleet Monitor",
    desc: "Real-time endpoint telemetry dashboard for your entire organization's fleet.",
  },
  {
    icon: <Bell className="w-6 h-6" strokeWidth={1.5} />,
    title: "Discord Alerts",
    desc: "Instant webhooks hitting your team's channels on every malicious finding.",
  },
  {
    icon: <FileText className="w-6 h-6" strokeWidth={1.5} />,
    title: "Executive PDF Reports",
    desc: "One-click branded export tailored for leadership and compliance auditing.",
  },
  {
    icon: <Code className="w-6 h-6" strokeWidth={1.5} />,
    title: "Public REST API",
    desc: "Integrate directly into your existing SIEM or SOAR via /api/v1/scan endpoint.",
  }
];

export function FeaturesGrid() {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.25 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: springConfig }
  };

  return (
    <section id="features" className="bg-[#050507] py-32 border-b border-white/5 overflow-hidden relative antialiased">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight antialiased">
            Everything Your SOC Team Needs.<br />Nothing It Doesn&apos;t.
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ 
                y: -4, 
                borderColor: "rgba(45,212,191,0.3)"
              }}
              className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-8 rounded-2xl transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-slate-800/50 border border-white/5 rounded-lg flex items-center justify-center text-teal-400 mb-6 group-hover:bg-teal-400/10 group-hover:border-teal-500/20 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight antialiased">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed antialiased">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
