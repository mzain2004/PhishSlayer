"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import PaddleCheckoutButton from "@/components/PaddleCheckoutButton";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

const PADDLE_PRICES = {
  SOC_PRO_MONTHLY: process.env.NEXT_PUBLIC_PADDLE_SOC_PRO_PRICE_ID || "",
  SOC_PRO_ANNUAL: process.env.NEXT_PUBLIC_PADDLE_SOC_PRO_PRICE_ID || "",
  CC_MONTHLY: process.env.NEXT_PUBLIC_PADDLE_CC_PRICE_ID || "",
  CC_ANNUAL: process.env.NEXT_PUBLIC_PADDLE_CC_PRICE_ID || "",
};

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();

  const getPriceId = (planName: string) => {
    if (planName === "SOC Pro") {
      return isAnnual ? PADDLE_PRICES.SOC_PRO_ANNUAL : PADDLE_PRICES.SOC_PRO_MONTHLY;
    }
    if (planName === "Command & Control") {
      return isAnnual ? PADDLE_PRICES.CC_ANNUAL : PADDLE_PRICES.CC_MONTHLY;
    }
    return "";
  };

  const handleAction = async (planName: string) => {
    if (planName === "Enterprise Edge") {
      router.push("/contact");
    } else if (planName === "Community") {
      router.push("/auth/signup");
    }
  };

  const tiers = [
    {
      name: "Community",
      monthlyPrice: "0",
      annualPrice: "0",
      description: "For individuals and small labs.",
      features: ["10 AI Scans / Day", "Community Threat Feed", "Public Sandbox Matches", "Standard Speed Detection"],
      cta: "Join Free",
      popular: false
    },
    {
      name: "SOC Pro",
      monthlyPrice: "49",
      annualPrice: "470",
      savings: "Save $118 — 2 months free",
      strikethrough: "$588",
      description: "For proactive security teams.",
      features: ["Unlimited AI Scans", "Real-Time EDR Agent (up to 50 nodes)", "Zero-Day Threat Signatures", "Discord/Slack Webhooks", "API Access (100 req/min)"],
      cta: "Start 14-Day Trial",
      popular: true
    },
    {
      name: "Command & Control",
      monthlyPrice: "299",
      annualPrice: "2870",
      savings: "Save $718 — 2 months free",
      strikethrough: "$3,588",
      description: "For critical infrastructure.",
      features: ["Unlimited EDR Nodes", "Dedicated Account Intel", "Custom YARA Rulesets", "Auto-Remediation Actions", "24/7 Priority Support"],
      cta: "Start Global Fleet",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="bg-[#0D1117] py-24 border-b border-[#1C2128] relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">Pricing</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em] mb-6">
            Priced for Security. Not Extortion.
          </h2>
          <p className="text-[#8B949E] text-[16px] max-w-2xl mx-auto mb-10 leading-[1.7]">
            Enterprise-grade endpoint security shouldn&apos;t require a VC funding round.
          </p>

          {/* New Toggle Styling */}
          <div className="flex justify-center mb-10">
            <div style={{
              display: 'inline-flex',
              background: '#161B22',
              border: '1px solid #30363D',
              borderRadius: '9999px',
              padding: '4px',
              gap: '4px',
            }}>
              <button 
                onClick={() => setIsAnnual(false)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: !isAnnual ? '#2DD4BF' : 'transparent',
                  color: !isAnnual ? '#0D1117' : '#8B949E',
                  fontWeight: !isAnnual ? 700 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isAnnual ? '#2DD4BF' : 'transparent',
                  color: isAnnual ? '#0D1117' : '#8B949E',
                  fontWeight: isAnnual ? 700 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Annual
                <span style={{
                  background: isAnnual ? 'rgba(0,0,0,0.2)' : '#3FB950',
                  color: isAnnual ? '#0D1117' : '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  -20%
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.25 } } }}
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 80 }, visible: { opacity: 1, y: 0, transition: springConfig } }}
              className={`relative p-8 rounded-[16px] flex flex-col transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(45,212,191,0.15)] ${
                tier.popular 
                  ? 'bg-gradient-to-b from-[#2DD4BF]/[0.08] to-[#161B22] border border-[#2DD4BF]/40' 
                  : 'bg-[#161B22] border border-[#30363D] hover:border-[#2DD4BF]'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#0D1117] font-mono text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-[4px]">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#E6EDF3] mb-2 tracking-tight">{tier.name}</h3>
                <p className="text-[#8B949E] text-sm">{tier.description}</p>
              </div>

              <div className="mb-8">
                {tier.name === 'Enterprise Edge' ? (
                  <span className="text-[56px] font-extrabold text-[#E6EDF3] tracking-[-0.03em] leading-none">Custom</span>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[56px] font-extrabold text-[#E6EDF3] tracking-[-0.03em] leading-none">
                        ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                      </span>
                      <span className="text-[16px] text-[#8B949E] font-normal">
                        / {isAnnual ? 'year' : 'month'}
                      </span>
                    </div>
                    {isAnnual && tier.name !== 'Community' && (
                      <div className="mt-2 flex flex-col gap-1">
                        <span className="text-[#3FB950] text-[13px] font-bold">
                          {tier.savings}
                        </span>
                        <span className="text-[#8B949E] text-sm line-through decoration-slate-500">
                          {tier.strikethrough}/yr
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feat, idx) => (
                  <li key={idx} className="flex flex-start gap-3">
                    <Check className="w-5 h-5 text-[#2DD4BF] shrink-0" strokeWidth={1.5} />
                    <span className="text-[#8B949E] text-sm leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>

              {tier.name === "Community" || tier.name === "Enterprise Edge" ? (
                <button 
                  onClick={() => handleAction(tier.name)}
                  className={`w-full py-3.5 rounded-full font-bold text-[15px] transition-all duration-200 focus:outline-none tracking-[0.01em] ${
                    tier.popular 
                      ? 'bg-[#2DD4BF] text-[#0D1117] hover:bg-[#14B8A6] hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(45,212,191,0.3)]' 
                      : 'bg-transparent text-[#E6EDF3] border border-[#30363D] hover:border-[#2DD4BF] hover:text-[#2DD4BF]'
                  }`}
                >
                  {tier.cta}
                </button>
              ) : (
                <PaddleCheckoutButton 
                  priceId={getPriceId(tier.name)}
                  variant={tier.popular ? "primary" : "outline"}
                  className="w-full !py-3.5"
                >
                  {tier.cta}
                </PaddleCheckoutButton>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
