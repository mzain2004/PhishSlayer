"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const springConfig = {
  type: "spring" as const,
  stiffness: 60,
  damping: 25,
  bounce: 0.1,
};

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();

  const handleAction = async (planName: string) => {
    if (planName === "Free") {
      router.push("/auth/signup");
      return;
    }
    window.location.href = "/auth/signup";
  };

  const tiers = [
    {
      name: "Free",
      monthlyPrice: "0",
      annualPrice: "0",
      description: "For individuals and small labs.",
      features: [
        "10 AI Scans / Day",
        "Community Threat Feed",
        "Public Sandbox Matches",
        "Standard Speed Detection",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "SOC Pro",
      monthlyPrice: "49",
      annualPrice: "470",
      savings: "Save $118 â€” 2 months free",
      strikethrough: "$588",
      description: "For proactive security teams.",
      features: [
        "Unlimited AI Scans",
        "Real-Time EDR Agent (up to 50 nodes)",
        "Zero-Day Threat Signatures",
        "Discord/Slack Webhooks",
        "API Access (100 req/min)",
      ],
      cta: "Upgrade Now",
      popular: false,
    },
    {
      name: "Command & Control",
      monthlyPrice: "299",
      annualPrice: "2870",
      savings: "Save $718 â€” 2 months free",
      strikethrough: "$3,588",
      description: "For critical infrastructure.",
      features: [
        "Unlimited EDR Nodes",
        "Dedicated Account Intel",
        "Custom YARA Rulesets",
        "Auto-Remediation Actions",
        "24/7 Priority Support",
      ],
      cta: "Start Global Fleet",
      popular: false,
    },
  ];

  return (
    <section
      id="pricing"
      className="bg-[#0D1117] py-24 border-b border-[#1C2128] relative"
    >
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em] mb-6">
            Priced for Security. Not Extortion.
          </h2>
          <p className="text-[#8B949E] text-[16px] max-w-2xl mx-auto mb-10 leading-[1.7]">
            Enterprise-grade endpoint security shouldn&apos;t require a VC
            funding round.
          </p>

          {/* New Toggle Styling */}
          <div className="flex justify-center mb-10">
            <div
              style={{
                display: "inline-flex",
                background: "#161B22",
                border: "1px solid #30363D",
                borderRadius: "9999px",
                padding: "4px",
                gap: "4px",
              }}
            >
              <button
                onClick={() => setIsAnnual(false)}
                style={{
                  padding: "8px 24px",
                  borderRadius: "9999px",
                  border: "none",
                  background: !isAnnual ? "#2DD4BF" : "transparent",
                  color: !isAnnual ? "#0D1117" : "#8B949E",
                  fontWeight: !isAnnual ? 700 : 400,
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                style={{
                  padding: "8px 24px",
                  borderRadius: "9999px",
                  border: "none",
                  background: isAnnual ? "#2DD4BF" : "transparent",
                  color: isAnnual ? "#0D1117" : "#8B949E",
                  fontWeight: isAnnual ? 700 : 400,
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Annual
                <span
                  style={{
                    background: isAnnual ? "rgba(0,0,0,0.2)" : "#3FB950",
                    color: isAnnual ? "#0D1117" : "#FFFFFF",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
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
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.25 } },
          }}
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {tiers.map((tier, i) => {
            const isCC = tier.name === "Command & Control";
            const isSocPro = tier.name === "SOC Pro";
            const isFree = tier.name === "Free";

            return (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 80 },
                  visible: { opacity: 1, y: 0, transition: springConfig },
                }}
                style={
                  isCC
                    ? {
                        border: "2px solid transparent",
                        background:
                          "linear-gradient(#161B22, #161B22) padding-box, linear-gradient(135deg, #2DD4BF, #A78BFA) border-box",
                        borderRadius: "16px",
                        transform: "scale(1.03)",
                        boxShadow: "0 0 40px rgba(45, 212, 191, 0.15)",
                      }
                    : {
                        border: "1px solid #30363D",
                        borderRadius: "16px",
                      }
                }
                className={`relative p-8 flex flex-col transition-all duration-300 ease-out hover:-translate-y-2 bg-black ${isCC ? "shadow-2xl z-20" : isFree ? "opacity-90" : ""}`}
              >
                {isCC && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #2DD4BF, #A78BFA)",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      display: "inline-block",
                      marginBottom: "12px",
                    }}
                  >
                    MOST POWERFUL
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[#E6EDF3] mb-2 tracking-tight">
                    {tier.name}
                  </h3>
                  <p className="text-[#8B949E] text-sm">{tier.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[56px] font-extrabold text-[#E6EDF3] tracking-[-0.03em] leading-none">
                        ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                      </span>
                      <span className="text-[16px] text-[#8B949E] font-normal">
                        / {isAnnual ? "year" : "month"}
                      </span>
                    </div>
                    {isAnnual && tier.monthlyPrice !== "0" && (
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
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex flex-start gap-3">
                      <Check
                        className={`w-5 h-5 shrink-0 ${isCC ? "text-[#A78BFA]" : "text-[#2DD4BF]"}`}
                        strokeWidth={1.5}
                      />
                      <span className="text-[#8B949E] text-sm leading-tight">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleAction(tier.name)}
                  style={
                    tier.name === "Free"
                      ? {
                          background: "transparent",
                          color: "#8B949E",
                          border: "1px solid #8B949E",
                          borderRadius: "6px",
                          width: "100%",
                          padding: "12px",
                        }
                      : isCC
                        ? {
                            background:
                              "linear-gradient(135deg, #2DD4BF, #A78BFA)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            width: "100%",
                            padding: "12px",
                          }
                        : {
                            background: "#2DD4BF",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            width: "100%",
                            padding: "12px",
                          }
                  }
                  className="font-bold text-[15px] transition-all duration-200 focus:outline-none tracking-[0.01em] hover:opacity-90"
                >
                  {tier.name === "Free"
                    ? "Get Started"
                    : isCC
                      ? "Get Started"
                      : "Get Started"}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

