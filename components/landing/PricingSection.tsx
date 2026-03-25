"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  const tiers = [
    {
      name: "Recon",
      desc: "Free Forever",
      price: "$0",
      features: ["10 scans/day", "1 agent", "Basic dashboard"],
      btnText: "Get Started",
      btnClass: "bg-transparent border border-white/10 hover:bg-white/5 text-white backdrop-blur-sm",
      href: "/auth/signup",
      popular: false,
    },
    {
      name: "SOC Pro",
      desc: "For growing teams",
      price: annual ? "$39" : "$49",
      oldPrice: annual ? "$49" : null,
      features: ["500 scans/day", "10 agents", "API access", "PDF exports", "Discord alerts"],
      btnText: "Start SOC Pro",
      btnClass: "bg-[#D946EF] hover:bg-[#D946EF]/90 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] border border-[#D946EF]/50",
      href: "/pricing",
      popular: true,
      priceId: process.env.NEXT_PUBLIC_PADDLE_SOC_PRO_PRICE_ID
    },
    {
      name: "Command & Control",
      desc: "Enterprise operations",
      price: annual ? "$239" : "$299",
      oldPrice: annual ? "$299" : null,
      features: ["Unlimited scans", "Unlimited agents", "SIEM webhooks", "Team management", "Priority support"],
      btnText: "Go Command Level",
      btnClass: "bg-transparent border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/10",
      href: "/pricing",
      popular: false,
      priceId: process.env.NEXT_PUBLIC_PADDLE_CC_PRICE_ID
    }
  ];

  const handleCheckout = (e: React.MouseEvent, priceId?: string) => {
    // Basic Paddle checkout trigger simulation if Paddle is loaded. 
    // Actual logic mostly driven through /pricing or app dashboard, but matching JSON spec.
    if (priceId && typeof window !== 'undefined' && (window as any).Paddle) {
      e.preventDefault();
      (window as any).Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }] });
    }
  };

  return (
    <section id="pricing" className="bg-[#050505] py-32 border-b border-white/10 overflow-hidden">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="lazyOnload" />
      
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6"
          >
            Enterprise Intelligence. Human-Sized Pricing.
          </motion.h2>
          
          {/* Toggle */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="flex items-center justify-center gap-4 text-sm font-bold"
          >
            <span className={!annual ? "text-white" : "text-[#8B949E]"}>Monthly</span>
            <button 
              onClick={() => setAnnual(!annual)}
              className="w-14 h-7 bg-white/5 backdrop-blur-md rounded-full p-1 relative border border-white/10 transition-colors"
            >
              <motion.div 
                layout
                className="w-5 h-5 bg-[#D946EF] rounded-full shadow-[0_0_10px_#D946EF]"
                animate={{ x: annual ? 28 : 0 }}
              />
            </button>
            <span className={annual ? "text-white" : "text-[#8B949E]"}>
              Annual <span className="text-[#D946EF] text-xs ml-1 bg-[#D946EF]/10 px-2 py-0.5 rounded-full border border-[#D946EF]/20">Save 20%</span>
            </span>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
              className={`relative bg-white/5 backdrop-blur-2xl rounded-2xl p-8 flex flex-col border ${
                t.popular ? "border-[#D946EF]/50 shadow-[0_0_30px_rgba(217,70,239,0.2),inset_0_1px_0_rgba(217,70,239,0.5)] scale-105 z-10" : "border-white/10"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D946EF] text-white shadow-[0_0_10px_#D946EF] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-[#D946EF]">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-black text-white mb-1">{t.name}</h3>
              <p className="text-[#8B949E] text-sm mb-6 pb-6 border-b border-white/10">{t.desc}</p>
              
              <div className="mb-6 flex items-end gap-2">
                {t.oldPrice && <span className="text-lg text-[#8B949E] line-through decoration-[#F85149]">{t.oldPrice}</span>}
                <span className="text-4xl font-black text-white">{t.price}</span>
                <span className="text-[#8B949E]">/mo</span>
              </div>

              <ul className="mb-8 space-y-4 flex-1">
                {t.features.map((f, j) => (
                  <li key={j} className="flex gap-3 text-white/90 text-sm items-center">
                    <Check className="w-4 h-4 text-[#D946EF]" /> {f}
                  </li>
                ))}
              </ul>

              <Link
                href={t.href}
                onClick={t.priceId ? (e) => handleCheckout(e, t.priceId) : undefined}
                className={`w-full text-center font-bold py-3 rounded-[8px] transition-all ${t.btnClass}`}
              >
                {t.btnText}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.6 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="flex flex-wrap justify-center gap-6 md:gap-12"
        >
          {["SOC 2 In Progress", "GDPR Compliant", "Microsoft Azure Hosted", "256-bit AES Encryption"].map((badge, i) => (
            <div key={i} className="text-[#8B949E] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B949E]" /> {badge}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
