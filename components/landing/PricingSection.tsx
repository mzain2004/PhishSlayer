"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();

  const handleAction = async (planName: string) => {
    if (planName === "Enterprise Edge") {
      router.push("/contact");
    } else {
      router.push(`/auth/signup?plan=${planName.toLowerCase()}`);
    }
  };

  const tiers = [
    {
      name: "Community",
      price: isAnnual ? "0" : "0",
      description: "For individuals and small labs.",
      features: [
        "10 AI Scans / Day",
        "Community Threat Feed",
        "Public Sandbox Matches",
        "Standard Speed Detection"
      ],
      cta: "Join Free",
      popular: false
    },
    {
      name: "Fleet Command",
      price: isAnnual ? "39" : "49",
      description: "For proactive security teams.",
      features: [
        "Unlimited AI Scans",
        "Real-Time EDR Agent (up to 50 nodes)",
        "Zero-Day Threat Signatures",
        "Discord/Slack Webhooks",
        "API Access (100 req/min)"
      ],
      cta: "Start 14-Day Trial",
      popular: true
    },
    {
      name: "Enterprise Edge",
      price: "Custom",
      description: "For critical infrastructure.",
      features: [
        "Unlimited EDR Nodes",
        "Dedicated Account Intel",
        "Custom YARA Rulesets",
        "Auto-Remediation Actions",
        "24/7 Priority Support"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.25 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: springConfig }
  };

  return (
    <section id="pricing" className="bg-[#050507] py-32 border-b border-white/5 relative antialiased">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6 antialiased">
            Priced for Security. Not Extortion.
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 antialiased">
            Enterprise-grade endpoint security shouldn&apos;t require a VC funding round. 
            Deploy fleet-wide protection today.
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-bold antialiased ${!isAnnual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-12 items-center rounded-full bg-slate-800 border border-white/10 transition-colors focus:outline-none"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${isAnnual ? 'translate-x-7 bg-[#2DD4BF]' : 'translate-x-1 bg-slate-500'}`} />
            </button>
            <span className={`text-sm font-bold flex items-center gap-2 antialiased ${isAnnual ? 'text-white' : 'text-slate-500'}`}>
              Annually <span className="text-[10px] bg-teal-400/10 text-teal-400 px-2 py-0.5 rounded-full border border-teal-400/20">SAVE 20%</span>
            </span>
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -4, borderColor: "rgba(45,212,191,0.3)" }}
              className={`relative bg-slate-900/40 backdrop-blur-2xl border ${tier.popular ? 'border-teal-500/30' : 'border-white/5'} p-8 rounded-2xl flex flex-col transition-all duration-300`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight antialiased">{tier.name}</h3>
                <p className="text-slate-400 text-sm antialiased">{tier.description}</p>
              </div>

              <div className="mb-8">
                {tier.price === 'Custom' ? (
                  <span className="text-4xl font-black text-white tracking-tight antialiased">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-black text-white tracking-tight antialiased">${tier.price}</span>
                    <span className="text-slate-500">/mo</span>
                  </>
                )}
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feat, idx) => (
                  <li key={idx} className="flex flex-start gap-3">
                    <Check className="w-5 h-5 text-teal-400 shrink-0" strokeWidth={1.5} />
                    <span className="text-slate-300 text-sm leading-tight antialiased">{feat}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleAction(tier.name)}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all duration-200 focus:outline-none antialiased ${
                  tier.popular 
                    ? 'bg-[#2DD4BF] text-slate-950 hover:bg-[#2DD4BF]/90' 
                    : 'bg-transparent text-white border border-white/10 hover:border-teal-500/30 hover:bg-white/[0.02]'
                }`}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
