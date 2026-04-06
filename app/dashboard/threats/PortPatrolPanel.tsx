"use client";

import { useState } from "react";
import {
  Radar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Globe,
  Timer,
  Wifi,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface PortScanResult {
  port: number;
  open: boolean;
  service: string;
  riskLevel: "critical" | "high" | "medium" | "info";
  description: string;
}

interface PortPatrolReport {
  target: string;
  resolvedIp: string;
  scannedAt: string;
  scanDurationMs: number;
  openPorts: PortScanResult[];
  riskSummary: string;
  overallRisk: "clean" | "suspicious" | "critical";
}

interface PortPatrolPanelProps {
  target: string;
  initialData?: PortPatrolReport | null;
}

export default function PortPatrolPanel({
  target,
  initialData,
}: PortPatrolPanelProps) {
  const [report, setReport] = useState<PortPatrolReport | null>(
    initialData || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0=idle, 1=dns, 2=scanning, 3=analyzing

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    setStep(1);

    try {
      // Simulate step progress
      setTimeout(() => setStep(2), 800);
      setTimeout(() => setStep(3), 3000);

      const res = await fetch("/api/recon/port-patrol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Scan failed" }));
        throw new Error(err.error || "Port scan failed");
      }

      const data = await res.json();
      setReport(data);
      toast.success("Port patrol scan complete");
    } catch (err: any) {
      setError(err.message || "Port scan failed");
      toast.error(err.message || "Port scan failed");
    } finally {
      setLoading(false);
      setStep(0);
    }
  };

  const riskRowClass = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/10 border-l-4 border-l-red-500 text-red-100";
      case "high":
        return "bg-orange-500/10 border-l-4 border-l-orange-500 text-orange-100";
      case "medium":
        return "bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-100";
      default:
        return "bg-white/10 border-l-4 border-l-slate-600 text-slate-300";
    }
  };

  const riskBadgeClass = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-[#8B949E] border-slate-500/20";
    }
  };

  const overallBadge = (risk: string) => {
    switch (risk) {
      case "critical":
        return {
          color: "bg-red-500/10 text-red-500 border-red-500/20",
          label: "ðŸ”´ CRITICAL",
        };
      case "suspicious":
        return {
          color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
          label: "ðŸŸ  SUSPICIOUS",
        };
      default:
        return {
          color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          label: "ðŸŸ¢ CLEAN",
        };
    }
  };

  // Loading state
  if (loading) {
    const steps = [
      { label: "Resolving DNS...", done: step > 1 },
      { label: "Scanning 16 ports...", done: step > 2 },
      { label: "Analyzing results...", done: false },
    ];
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Radar className="w-8 h-8 text-orange-500 animate-pulse" />
        </div>
        <div className="space-y-2 w-64">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              {step > i + 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : step === i + 1 ? (
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-white/10 shrink-0" />
              )}
              <span
                className={`text-sm ${step >= i + 1 ? "text-white font-semibold" : "text-[#8B949E]"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-sm font-semibold text-red-400">{error}</p>
        <button
          onClick={runScan}
          className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-400 transition-colors"
        >
          Retry Scan
        </button>
      </div>
    );
  }

  // Initial state
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-sm">
          <Radar className="w-10 h-10 text-orange-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Port Patrol</h3>
          <p className="text-sm text-[#8B949E] mt-1 max-w-xs">
            Active reconnaissance â€” scans 16 high-risk ports for open services
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 max-w-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400/90">
              This performs active network reconnaissance. Only scan targets you
              are authorized to test.
            </p>
          </div>
        </div>
        <button
          onClick={runScan}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-orange-500 transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5"
        >
          <Radar className="w-4 h-4" />
          Launch Port Patrol
        </button>
      </div>
    );
  }

  // Results view
  const badge = overallBadge(report.overallRisk);
  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-bold text-white">Port Patrol</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
            Active Recon
          </span>
        </div>
        <button
          onClick={runScan}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-400 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 border border-orange-500/20 transition-colors"
        >
          Re-scan
        </button>
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="w-3.5 h-3.5 text-[#8B949E]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
              Resolved IP
            </p>
          </div>
          <p className="text-sm font-mono font-bold text-white">
            {report.resolvedIp}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer className="w-3.5 h-3.5 text-[#8B949E]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
              Duration
            </p>
          </div>
          <p className="text-sm font-bold text-white">
            {(report.scanDurationMs / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wifi className="w-3.5 h-3.5 text-[#8B949E]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
              Open Ports
            </p>
          </div>
          <p className="text-sm font-bold text-white">
            {report.openPorts.length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#8B949E]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
              Risk
            </p>
          </div>
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Open ports table or clean state */}
      {report.openPorts.length > 0 ? (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  Port
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  Service
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  Risk
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {report.openPorts.map((p) => (
                <tr key={p.port} className={riskRowClass(p.riskLevel)}>
                  <td className="px-4 py-2.5 font-mono font-bold text-white/90">
                    {p.port}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-white/80">
                    {p.service}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${riskBadgeClass(p.riskLevel)}`}
                    >
                      {p.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E] text-xs">
                    {p.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 gap-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          <p className="text-sm font-bold text-emerald-400">
            No high-risk ports detected
          </p>
          <p className="text-xs text-emerald-500/80">
            Target has a minimal attack surface across all 16 scanned ports
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-sm text-slate-300">{report.riskSummary}</p>
        <p className="text-[10px] text-[#8B949E] mt-2">
          Scanned at: {new Date(report.scannedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

