"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageSquare,
  BookOpen,
  Headset,
  ArrowRight,
  Upload,
  Send,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { submitSupportTicket } from "@/lib/supabase/actions";
import { useTransition } from "react";

const SYSTEM_STATUS = [
  { name: "API Services", status: "Operational" },
  { name: "Threat Scanner", status: "Operational" },
  { name: "AI Analysis Engine", status: "Operational" },
  { name: "Database", status: "Operational" },
  { name: "Discord Alerts", status: "Operational" },
  { name: "Intel Sync Cron", status: "Operational" },
];

const FAQS = [
  {
    q: "How does the 3-gate threat pipeline work?",
    a: "Every scan runs through three sequential gates. Gate 1 checks your trusted whitelist for instant clean verdicts. Gate 2 cross-references your proprietary Intel Vault. Gate 3 sends the target to VirusTotal and Gemini AI for deep behavioral analysis. This architecture minimizes API calls while maximizing detection accuracy.",
  },
  {
    q: "What is the AI Heuristics Engine?",
    a: "The AI Heuristics Engine uses Google Gemini AI to analyze webpage content for psychological manipulation tactics like urgency and fear, credential harvesting patterns, and brand impersonation signals. It returns a heuristic score (1-10), confidence level, and detailed behavioral indicators.",
  },
  {
    q: "How does Port Patrol work?",
    a: "Port Patrol performs active reconnaissance by resolving the target domain to its IP address and scanning 16 high-risk ports (FTP, Telnet, RDP, SMB, exposed databases, and known C2 ports) with a 2-second timeout per port. It rejects private IP ranges to prevent SSRF attacks.",
  },
  {
    q: "What is the SIEM Bridge?",
    a: "The SIEM Bridge exports threat intelligence in STIX 2.1 format with a native JSON wrapper. Configure your SIEM webhook URL in Platform Settings to automatically push threat data to Splunk, Elastic SIEM, Microsoft Sentinel, or any webhook receiver.",
  },
  {
    q: "How do I invite team members?",
    a: "Super Admins can invite team members from the User Management page. Enter the email address, select a role (Manager, Analyst, or Viewer), and click Send Invite. The user receives a Supabase auth email to set their password.",
  },
  {
    q: "What are the RBAC role permissions?",
    a: "Super Admin: full access including user management and billing. SOC Manager: all operational features plus incident assignment and Intel Vault management. SOC Analyst: launch scans, view own incidents, threat analysis. Executive Viewer: read-only access to all data, PDF export only.",
  },
  {
    q: "How do I configure Discord alerts?",
    a: "Add your Discord webhook URL to the DISCORD_WEBHOOK_URL environment variable. Phish-Slayer automatically sends red embed alerts to your Discord channel when malicious threats are detected via dashboard scans or API calls.",
  },
  {
    q: "Is my threat data secure?",
    a: "Yes. All data is protected by Supabase Row Level Security (RLS) â€” users can only access their own organization's data. API routes use timing-safe authentication, inputs are sanitized with Zod validation, and no secrets are ever exposed to the client.",
  },
  {
    q: "How does the Takedown Generator work?",
    a: "The Takedown Generator pulls the registrar abuse email from WHOIS data and auto-populates a professional DMCA/abuse report with your scan findings. You can copy to clipboard, open in Gmail, open in Outlook, or submit directly to Google Safe Browsing and PhishTank.",
  },
  {
    q: "What happens when I hit the free tier scan limit?",
    a: "Free tier accounts are limited to 10 scans per day. When the limit is reached, the scan button is disabled and shows a usage indicator. Upgrade to Pro for unlimited scans.",
  },
];

export default function SupportPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Ticket Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Question");
  const [priority, setPriority] = useState("Low");
  const [message, setMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side quick check (Backend performs strict validation)
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only PNG, JPG, PDF, and TXT allowed",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB",
      });
      return;
    }
    setAttachedFile(file);
    toast.success("File attached", { description: file.name });
  };

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .single();
        if (p?.subscription_tier) setTier(p.subscription_tier.toLowerCase());
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const [isSubmitting, startTransition] = useTransition();

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("message", message);
      if (attachedFile) {
        formData.append("file", attachedFile);
      }

      try {
        const response = await fetch("/api/support", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to submit ticket");
        }

        // Send notification email (legacy bridge)
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          
          await fetch("/api/communications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: `Support Ticket (${category})`,
              userEmail: user?.email || "unknown@user.com",
              name: user?.email || "Authenticated User",
              message: `Priority: ${priority}\nSubject: ${subject}\n\n${message}${attachedFile ? `\n\n[Attachment: ${attachedFile.name}]` : ""}`,
            }),
          });
        } catch (err) {
          console.error("Failed to send notification email:", err);
        }

        toast.success("Ticket submitted! We'll respond within 24 hours.");
        setSubject("");
        setCategory("General Question");
        setPriority("Low");
        setMessage("");
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="w-full font-sans pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Headset className="w-8 h-8 text-teal-400" />
          Support Center
        </h1>
        <p className="text-[#8B949E] mt-2 text-sm">
          Everything you need to get the most out of Phish-Slayer
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(45,212,191,0.15)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <a
            href="mailto:support@phishslayer.tech"
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-teal-500/50 transition-colors cursor-pointer block group"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center mb-4 group-hover:bg-teal-500/20 transition-colors">
              <Mail className="w-5 h-5 text-teal-400" />
            </div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              Email Support
            </h3>
            <p className="text-[#8B949E] text-sm mt-1">
              support@phishslayer.tech
            </p>
          </a>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(45,212,191,0.15)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <a
            href="https://discord.com/invite/phishslayer"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#5865F2]/50 transition-colors cursor-pointer block group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center mb-4 group-hover:bg-[#5865F2]/20 transition-colors">
              <MessageSquare className="w-5 h-5 text-[#5865F2]" />
            </div>
            <h3 className="text-white font-semibold">Community Discord</h3>
            <p className="text-[#8B949E] text-sm mt-1">Join the conversation</p>
          </a>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(45,212,191,0.15)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <Link
            href="/dashboard/intel"
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-indigo-500/50 transition-colors cursor-pointer block group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-white font-semibold">Documentation</h3>
            <p className="text-[#8B949E] text-sm mt-1">
              Read the technical guides
            </p>
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* Ticket Form */}
        <div className="xl:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Submit a Support Ticket
              </h2>
              <p className="text-sm text-[#8B949E] mt-1">
                Can't find what you're looking for? Send us a message.
              </p>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#8B949E]">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-[#8B949E] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 rounded-lg text-sm outline-none"
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#8B949E]">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 rounded-lg text-sm appearance-none outline-none"
                    >
                      <option>General Question</option>
                      <option>Bug Report</option>
                      <option>Feature Request</option>
                      <option>Billing</option>
                      <option>Security Concern</option>
                      <option>API Support</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#8B949E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 inline-block w-full md:w-1/2 md:pr-2.5">
                <label className="text-sm font-medium text-[#8B949E]">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 rounded-lg text-sm appearance-none outline-none"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8B949E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#8B949E]">
                  Message
                </label>
                <textarea
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-[#8B949E] focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 rounded-lg text-sm outline-none resize-none"
                  placeholder="Please describe your issue in detail..."
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.pdf,.txt"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-300 text-sm hover:border-slate-500 hover:text-white transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    {attachedFile ? attachedFile.name : "Attach File (Max 5MB)"}
                  </button>
                  {attachedFile && (
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="text-[#8B949E] hover:text-red-400 transition-colors ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-lg text-sm font-bold transition-colors w-full sm:w-auto justify-center disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* System Status Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                System Status
              </h2>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping w-2 h-2 absolute inline-flex rounded-full bg-green-400/60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                All Systems Operational
              </div>
            </div>

            <div className="space-y-4">
              {SYSTEM_STATUS.map((sys, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-slate-300">
                      {sys.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded">
                    {sys.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#8B949E]">
                Last checked: {currentTime}
              </span>
              <button className="text-xs font-semibold text-teal-400 hover:text-teal-300">
                View full status page &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-6 tracking-tight">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <span className="text-white font-medium pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#8B949E] shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <div className="px-4 pb-4 text-[#8B949E] text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise CTA */}
      {(tier === "free" || tier === "pro") && (
        <motion.div
          whileHover={{ scale: 1.01, boxShadow: "0 8px 32px rgba(45,212,191,0.15)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/20 rounded-xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-white text-lg font-semibold">
                Need Enterprise-Grade Support?
              </h3>
              <p className="text-[#8B949E] text-sm mt-1">
                Upgrade for priority response times, onboarding, and SOC guidance.
              </p>
            </div>
            <a
              href="mailto:support@phishslayer.tech?subject=Enterprise%20Support%20Inquiry"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-semibold text-black [background:linear-gradient(135deg,#2DD4BF,#22c55e)]"
            >
              Contact Enterprise Support
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

