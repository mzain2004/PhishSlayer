"use client";

import { useState } from "react";
import { X, Copy, Mail, ExternalLink, CheckCircle2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PhishButton from "@/components/ui/PhishButton";

interface TakedownModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: string;
  registrarAbuseEmail: string | null;
  resolvedIp: string | null;
  riskScore: number;
  aiScore: number | null;
  hasSSL: boolean;
  threatCategory: string;
  openPorts: number[];
  manipulationTactics: string[];
}

export default function TakedownModal({
  isOpen,
  onClose,
  target,
  registrarAbuseEmail,
  resolvedIp,
  riskScore,
  aiScore,
  hasSSL,
  threatCategory,
  openPorts,
  manipulationTactics,
}: TakedownModalProps) {
  const defaultRecipient = registrarAbuseEmail || "";
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [copied, setCopied] = useState(false);

  const subject = `Abuse Report: Phishing/Malware Infrastructure — ${target}`;

  const tactics =
    manipulationTactics.length > 0
      ? manipulationTactics.map((t) => `• ${t}`).join("\n")
      : "• Suspicious content detected";

  const body = `To Whom It May Concern,

I am writing to report a confirmed phishing/malware threat hosted at the following domain/IP address under your management:

THREAT DETAILS
─────────────────────────────────
Target:           ${target}
Resolved IP:      ${resolvedIp || "See scan report"}
Risk Score:       ${riskScore}/100
AI Heuristic:     ${aiScore !== null ? `${aiScore}/10` : "Not analyzed"}
Threat Category:  ${threatCategory}
SSL Certificate:  ${hasSSL ? "Present" : "⚠️ MISSING — Likely Phishing"}
Open Risk Ports:  ${openPorts.length > 0 ? openPorts.join(", ") : "None detected"}
Detection Date:   ${new Date().toUTCString()}

BEHAVIORAL INDICATORS
─────────────────────────────────
${tactics}

REQUESTED ACTION
─────────────────────────────────
We request the immediate suspension of this domain/IP and investigation of the hosting account. This threat was identified by automated cybersecurity tooling and verified by AI analysis.

Supporting evidence and full scan reports are available upon request.

Reported via Phish-Slayer Threat Intelligence Platform`;

  const [editableBody, setEditableBody] = useState(body);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `To: ${recipient}\nSubject: ${subject}\n\n${editableBody}`,
      );
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(editableBody)}`;
    window.open(mailtoUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white/5 border border-[rgba(48,54,61,0.9)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Gavel className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Takedown Request Generator
              </h2>
              <p className="text-xs text-[#8B949E]">
                Auto-generated abuse report for{" "}
                <span className="font-mono font-bold">{target}</span>
              </p>
            </div>
          </div>
          <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={onClose}
            className="rounded-full p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-[#8B949E]" />
          </PhishButton>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Recipient */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8B949E] block mb-1.5">
              Recipient (Registrar Abuse Email)
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="abuse@registrar.com"
              className="w-full px-3 py-2 border border-[rgba(48,54,61,0.9)] bg-black rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            {!registrarAbuseEmail && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Registrar abuse email not found in WHOIS. Try abuse@
                {target.split(".").slice(-2).join(".")}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-[#8B949E]">
                Also report to:
              </span>
              <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={() => setRecipient("reportphishing@google.com")}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline font-mono"
              >
                reportphishing@google.com
              </PhishButton>
              <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={() => setRecipient("phishing-report@us-cert.gov")}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline font-mono"
              >
                phishing-report@us-cert.gov
              </PhishButton>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8B949E] block mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              readOnly
              className="w-full px-3 py-2 border border-[rgba(48,54,61,0.9)] rounded-lg text-sm text-white bg-white/10 font-mono"
            />
          </div>

          {/* Email body */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8B949E] block mb-1.5">
              Email Body
            </label>
            <textarea
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 border border-[rgba(48,54,61,0.9)] bg-black rounded-lg text-xs text-slate-300 font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 p-5 border-t border-white/10 bg-white/5 rounded-b-2xl">
          <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleCopy}
            className="rounded-full flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-400 transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </PhishButton>
          <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleMailto}
            className="rounded-full flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-slate-700 border border-[rgba(48,54,61,0.9)] transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Open in Mail App
          </PhishButton>
          <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => {
              const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(editableBody)}`;
              window.open(gmailUrl, "_blank");
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(48,54,61,0.9)] text-slate-300 text-xs font-bold rounded-lg hover:bg-white/10 transition-colors bg-white/10"
          >
            <Mail className="w-3.5 h-3.5" />
            Open in Gmail
          </PhishButton>
          <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => {
              const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(recipient)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(editableBody)}`;
              window.open(outlookUrl, "_blank");
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(48,54,61,0.9)] text-slate-300 text-xs font-bold rounded-lg hover:bg-white/10 transition-colors bg-white/10"
          >
            <Mail className="w-3.5 h-3.5" />
            Open in Outlook Web
          </PhishButton>
          <a
            href="https://safebrowsing.google.com/safebrowsing/report_phish/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(48,54,61,0.9)] text-slate-300 text-xs font-bold rounded-lg hover:bg-white/10 transition-colors bg-white/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Safe Browsing
          </a>
          <a
            href="https://www.phishtank.com/add_web_phish.php"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(48,54,61,0.9)] text-slate-300 text-xs font-bold rounded-lg hover:bg-white/10 transition-colors bg-white/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            PhishTank
          </a>
        </div>

        <p className="text-[10px] text-center text-[#8B949E] pb-3">
          This report is auto-generated. Review before sending.
        </p>
      </div>
    </div>
  );
}

