"use client";

import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Mail, Bug, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { submitContact } from "./actions";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      company: formData.get("company"),
      type: formData.get("type"),
      message: formData.get("message"),
    };

    const res = await submitContact(formData);

    if (res.error) {
      setStatus("error");
      setErrorMsg(res.error);
    } else {
      // Send email via communication API
      try {
        await fetch("/api/communications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: `Contact Form (${data.type})`,
            userEmail: data.email,
            name: `${data.firstName} ${data.lastName}${data.company ? ` (${data.company})` : ""}`,
            message: data.message,
          }),
        });
      } catch (err) {
        console.error("Failed to send notification email:", err);
      }

      setStatus("success");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  const contactOptions = [
    { icon: <Mail />, title: "General Inquiries", detail: "support@phishslayer.tech", color: "text-[#2DD4BF]" },
    { icon: <Bug />, title: "Bug Reports / Security", detail: "security@phishslayer.tech", color: "text-[#F85149]" },
    { icon: <TrendingUp />, title: "Investor Relations", detail: "support@phishslayer.tech (Subject: Investment)", color: "text-[#E3B341]" },
    { icon: <Clock />, title: "SLA Response Time", detail: "Within 24 Hours", color: "text-[#A78BFA]" },
  ];

  return (
    <div className="bg-[#0D1117] text-[#E6EDF3] font-sans min-h-screen">
      <Header />
      
      <main className="pt-24 min-h-screen">
        {/* HERO */}
        <section className="py-24 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#2DD4BF]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
              className="text-4xl md:text-6xl font-black text-[#E6EDF3] tracking-tight mb-6"
            >
              Talk to a Human.<br />Not a Bot.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-[#8B949E] leading-relaxed max-w-2xl mx-auto"
            >
              Whether you have a security question, want a demo, or are interested in investing â€” we respond within 24 hours.
            </motion.p>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-16">
            
            {/* Left: Contact Options */}
            <div className="lg:col-span-2 space-y-6">
              {contactOptions.map((opt, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="liquid-glass p-6 rounded-[12px] flex items-center gap-4 hover:border-white/20 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-[8px] bg-[#0D1117] border border-white/10 flex items-center justify-center ${opt.color}`}>
                    {opt.icon}
                  </div>
                  <div>
                    <h3 className="text-[#E6EDF3] font-bold text-sm mb-1">{opt.title}</h3>
                    <p className="text-[#8B949E] text-sm font-mono">{opt.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Right: Form */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="lg:col-span-3 liquid-glass rounded-[12px] p-8 md:p-12 shadow-2xl"
            >
              {status === "success" ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-16 h-16 bg-[#3FB950]/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-[#3FB950]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#E6EDF3] mb-2">Message Sent Successfully</h3>
                  <p className="text-[#8B949E]">We&apos;ve received your inquiry and will be in touch within 24 hours.</p>
                  <button 
                    onClick={() => setStatus("idle")}
                    className="mt-8 text-[#2DD4BF] font-bold text-sm hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#8B949E]">First Name <span className="text-[#F85149]">*</span></label>
                      <input name="firstName" required className="w-full bg-[#0D1117] border border-white/10 rounded-[8px] px-4 py-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#8B949E]">Last Name <span className="text-[#F85149]">*</span></label>
                      <input name="lastName" required className="w-full bg-[#0D1117] border border-white/10 rounded-[8px] px-4 py-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]" />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#8B949E]">Email Address <span className="text-[#F85149]">*</span></label>
                      <input type="email" name="email" required className="w-full bg-[#0D1117] border border-white/10 rounded-[8px] px-4 py-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#8B949E]">Company</label>
                      <input name="company" className="w-full bg-[#0D1117] border border-white/10 rounded-[8px] px-4 py-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#8B949E]">Inquiry Type</label>
                    <select name="type" className="w-full bg-[#0D1117] border border-white/10 rounded-[8px] px-4 py-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF] appearance-none">
                      <option>General Inquiry</option>
                      <option>Demo Request</option>
                      <option>Bug Report</option>
                      <option>Investment</option>
                      <option>Partnership</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#8B949E]">Message <span className="text-[#F85149]">*</span></label>
                    <textarea name="message" required rows={5} className="w-full bg-[#0D1117] border border-white/10 rounded-[8px] px-4 py-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF] resize-none" />
                  </div>

                  {status === "error" && (
                    <div className="flex items-center gap-2 text-[#F85149] text-sm bg-[#F85149]/10 p-3 rounded-[8px] border border-[#F85149]/20">
                      <AlertCircle className="w-4 h-4" /> {errorMsg}
                    </div>
                  )}

                  <button 
                    disabled={loading}
                    className="w-full bg-[#2DD4BF] text-[#0D1117] font-bold py-4 rounded-[8px] hover:bg-[#2DD4BF]/90 transition-all shadow-[0_0_20px_rgba(45,212,191,0.15)] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending Message..." : "Send Message"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

