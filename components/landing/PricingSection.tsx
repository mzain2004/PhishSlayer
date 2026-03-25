"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  return (
    <section id="pricing" className="bg-[#050505] py-32 border-b border-white/10 relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
            Priced for Security. Not Extortion.
          </h2>
          <p className="text-[#8B949E] text-lg max-w-2xl mx-auto mb-10">
            Enterprise-grade endpoint security shouldn't require a VC funding round. 
            Deploy fleet-wide protection today.
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-bold ${!isAnnual ? 'text-white' : 'text-[#8B949E]'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-12 items-center rounded-full bg-white/10 border border-white/20 transition-colors focus:outline-none"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${isAnnual ? 'translate-x-7 bg-[#8B5CF6]' : 'translate-x-1 bg-[#8B949E]'}`} />
            </button>
            <span className={`text-sm font-bold flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-[#8B949E]'}`}>
              Annually <span className="text-[10px] bg-white/10 text-[#8B5CF6] px-2 py-0.5 rounded-full">SAVE 20%</span>
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
             <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
              className={`relative bg-white/[0.02] backdrop-blur-xl border ${tier.popular ? 'border-[#8B5CF6]/50' : 'border-white/[0.08]'} p-8 rounded-2xl flex flex-col`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-[#8B949E] text-sm">{tier.description}</p>
              </div>

              <div className="mb-8">
                {tier.price === 'Custom' ? (
                  <span className="text-4xl font-black text-white">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-black text-white">${tier.price}</span>
                    <span className="text-[#8B949E]">/mo</span>
                  </>
                )}
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feat, idx) => (
                  <li key={idx} className="flex flex-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] shrink-0" />
                    <span className="text-white/80 text-sm leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleAction(tier.name)}
                className={`w-full py-3 rounded-[8px] font-bold text-sm transition-all focus:outline-none ${
                  tier.popular 
                    ? 'bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90 border border-[#8B5CF6]' 
                    : 'bg-transparent text-white border border-white/20 hover:bg-white/5'
                }`}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
