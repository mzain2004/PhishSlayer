"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Trash2,
  Loader2,
  ShieldCheck,
  Database,
  ListPlus,
  AlertTriangle,
  Code,
  Copy,
} from "lucide-react";
import {
  getWhitelist,
  removeFromWhitelist,
  getIntelIndicators,
  removeIntelIndicator,
} from "@/lib/supabase/actions";
import { useRole } from "@/lib/rbac/useRole";
import { canManageIntelVault } from "@/lib/rbac/roles";
import { useTier } from "@/hooks/useTier";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";

const cardHover = {
  whileHover: {
    scale: 1.02,
    boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
  },
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

/* ── Severity Badge ───────────────────────────────────────────────── */
function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() ?? "";
  let bg = "bg-white/10 text-[#E6EDF3] border border-[rgba(48,54,61,0.9)]";
  if (s === "critical") {
    bg =
      "bg-[rgba(248,81,73,0.2)] text-[#F85149] border border-[rgba(248,81,73,0.35)]";
  } else if (s === "high") {
    bg =
      "bg-[rgba(227,179,65,0.2)] text-[#E3B341] border border-[rgba(227,179,65,0.35)]";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-[10px] py-[2px] text-[11px] font-bold uppercase tracking-wider ${bg}`}
    >
      {severity || "Unknown"}
    </span>
  );
}

function TypeBadge({ value }: { value: string | null }) {
  const t = (value || "").toUpperCase();
  const isKnownType = t === "DOMAIN" || t === "IPV4" || t === "URL";
  return (
    <span
      className={`inline-flex items-center rounded-full px-[10px] py-[2px] text-[11px] font-bold uppercase tracking-wider ${
        isKnownType
          ? "bg-[rgba(45,212,191,0.15)] text-[#2DD4BF] border border-[rgba(45,212,191,0.35)]"
          : "bg-white/10 text-[#E6EDF3] border border-[rgba(48,54,61,0.9)]"
      }`}
    >
      {value || "N/A"}
    </span>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function IntelVaultPage() {
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      getWhitelist().then((data: any[]) => setWhitelist(data)),
      getIntelIndicators().then((data: any[]) => setIndicators(data)),
    ]).finally(() => setLoaded(true));
  }, []);

  const { role, loading: roleLoading } = useRole();
  const isManager = role && canManageIntelVault(role);

  const handleRemoveWhitelist = (id: string) => {
    startTransition(async () => {
      try {
        await removeFromWhitelist(id);
        const data = await getWhitelist();
        setWhitelist(data);
        toast.success("Target removed from whitelist.");
      } catch (err: any) {
        toast.error(err.message || "Failed to remove target.");
      }
    });
  };

  const handleRemoveIndicator = (id: string) => {
    startTransition(async () => {
      try {
        await removeIntelIndicator(id);
        const data = await getIntelIndicators();
        setIndicators(data);
        toast.success("Indicator removed from Intel Vault.");
      } catch (err: any) {
        toast.error(err.message || "Failed to remove indicator.");
      }
    });
  };

  const { limits, isSuperAdmin, loading: tierLoading } = useTier();

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (!loaded || roleLoading || tierLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!limits.canUseIntelVault && !isSuperAdmin) {
    return (
      <div className="text-white font-sans min-h-screen pt-20">
        <UpgradeBanner
          feature="Proprietary Intel Vault"
          requiredTier="Command & Control"
        />
      </div>
    );
  }

  /* ── Page ─────────────────────────────────────────────────────────── */
  return (
    <div className="text-white font-sans min-h-screen flex flex-col w-full overflow-x-hidden">
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Database className="w-7 h-7 text-teal-400" />
            Intel Vault
          </h1>
          <p className="text-[#8B949E] mt-2 text-sm">
            Manage your organization&apos;s whitelisted targets and proprietary
            threat intelligence indicators.
          </p>
        </div>

        {!isManager && (
          <div className="mb-8 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <p className="text-sm font-medium text-blue-300">
              You have view-only access to the Intel Vault. Only SOC Managers
              and Super Admins can add or remove items.
            </p>
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Whitelisted",
              value: whitelist.length,
              icon: ShieldCheck,
              color: "text-green-400 bg-green-500/10 border-green-500/20",
            },
            {
              label: "Total Indicators",
              value: indicators.length,
              icon: Database,
              color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
            },
            {
              label: "Critical",
              value: indicators.filter(
                (i) => i.severity?.toLowerCase() === "critical",
              ).length,
              icon: AlertTriangle,
              color: "text-red-400 bg-red-500/10 border-red-500/20",
            },
            {
              label: "High",
              value: indicators.filter(
                (i) => i.severity?.toLowerCase() === "high",
              ).length,
              icon: AlertTriangle,
              color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
            },
          ].map((kpi) => (
            <motion.div
              {...cardHover}
              key={kpi.label}
              className={`rounded-[12px] border bg-[rgba(22,27,34,0.88)] border-[rgba(48,54,61,0.9)] p-4 flex items-center gap-4 backdrop-blur-[8px] ${kpi.color}`}
            >
              <kpi.icon className="w-6 h-6 shrink-0 opacity-80" />
              <div>
                <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                <p className="text-xs font-semibold mt-1 uppercase tracking-wider opacity-70">
                  {kpi.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* ────────────── Whitelist Table ────────────── */}
          <motion.div
            {...cardHover}
            className="w-full xl:w-[380px] xl:min-w-[340px] bg-[rgba(255,255,255,0.04)] rounded-2xl border border-[rgba(255,255,255,0.08)] backdrop-blur-[8px] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 text-[#E6EDF3]">
              <ListPlus className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-semibold text-white">
                Target Whitelist
              </h2>
              <span className="ml-auto text-xs font-bold text-[#8B949E] bg-[rgba(22,27,34,0.85)] rounded-full px-2.5 py-0.5 border border-[rgba(48,54,61,0.9)]">
                {whitelist.length}
              </span>
            </div>

            {/* Table header */}
            <div className="bg-[rgba(22,27,34,0.85)] px-5 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E6EDF3] uppercase tracking-wider">
                Target
              </span>
              <span className="text-[11px] font-bold text-[#E6EDF3] uppercase tracking-wider">
                Date Added
              </span>
            </div>

            {/* Body */}
            {whitelist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <ListPlus className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">
                  No whitelisted targets found.
                </p>
                <p className="text-xs text-[#8B949E] mt-1 max-w-[220px]">
                  Targets added from the Threat Intel dashboard will appear
                  here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {whitelist.map((item) => (
                  <li
                    key={item.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-[#E6EDF3] truncate">
                        {item.target}
                      </span>
                      <span className="text-[11px] text-[#E6EDF3] mt-0.5">
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {isManager && (
                      <button
                        onClick={() => handleRemoveWhitelist(item.id)}
                        disabled={isPending}
                        aria-label={`Remove ${item.target} from whitelist`}
                        className="p-1.5 rounded-md text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* ────────────── Intel Vault Table ────────────── */}
          <motion.div
            {...cardHover}
            className="flex-1 w-full bg-[rgba(255,255,255,0.04)] rounded-2xl border border-[rgba(255,255,255,0.08)] backdrop-blur-[8px] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 text-[#E6EDF3]">
              <Database className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-semibold text-white">
                Proprietary Intel Vault
              </h2>
              <span className="ml-auto text-xs font-bold text-[#8B949E] bg-[rgba(22,27,34,0.85)] border border-[rgba(48,54,61,0.9)] rounded-full px-2.5 py-0.5">
                {indicators.length}
              </span>
            </div>

            {/* Table header */}
            <div className="bg-[rgba(22,27,34,0.85)] px-5 py-2 border-b border-white/10 grid grid-cols-12 gap-3 items-center">
              <span className="col-span-5 text-[11px] font-bold text-[#E6EDF3] uppercase tracking-wider">
                Indicator
              </span>
              <span className="col-span-2 text-[11px] font-bold text-[#E6EDF3] uppercase tracking-wider">
                Type
              </span>
              <span className="col-span-2 text-[11px] font-bold text-[#E6EDF3] uppercase tracking-wider">
                Severity
              </span>
              <span className="col-span-2 text-[11px] font-bold text-[#E6EDF3] uppercase tracking-wider">
                Source
              </span>
              <span className="col-span-1" />
            </div>

            {/* Body */}
            {indicators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <Database className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">
                  No threat indicators found.
                </p>
                <p className="text-xs text-[#8B949E] mt-1 max-w-sm">
                  Run the intel harvester or manually add indicators to populate
                  this vault.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {indicators.map((item) => (
                  <li
                    key={item.id}
                    className="px-5 py-3 grid grid-cols-12 gap-3 items-center hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
                  >
                    {/* Indicator */}
                    <div className="col-span-5 min-w-0">
                      <p
                        className="text-sm font-semibold text-[#E6EDF3] truncate"
                        title={item.indicator}
                      >
                        {item.indicator}
                      </p>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <TypeBadge value={item.type || null} />
                    </div>

                    {/* Severity */}
                    <div className="col-span-2">
                      <SeverityBadge severity={item.severity} />
                    </div>

                    {/* Source */}
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-[#E6EDF3] truncate block">
                        {item.source || "—"}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="col-span-1 flex justify-end">
                      {isManager && (
                        <button
                          onClick={() => handleRemoveIndicator(item.id)}
                          disabled={isPending}
                          aria-label={`Remove indicator ${item.indicator}`}
                          className="p-1.5 rounded-md text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>

        {/* ────────────── API Documentation ────────────── */}
        <motion.div
          {...cardHover}
          className="mt-10 bg-[rgba(15,23,42,0.58)] rounded-xl border border-[rgba(45,212,191,0.16)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/10 bg-[rgba(22,27,34,0.85)] flex items-center gap-3">
            <Code className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-semibold text-white">
              Public API v1
            </h2>
            <span className="ml-auto text-[10px] font-bold text-teal-400 bg-teal-500/10 rounded-full px-2.5 py-0.5 border border-teal-500/20">
              BETA
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Endpoint */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Endpoint
              </h3>
              <div className="bg-black border border-[rgba(48,54,61,0.9)] rounded-lg px-4 py-3 font-mono text-sm text-green-400 flex items-center justify-between gap-4">
                <span>
                  <span className="text-teal-400 font-bold">GET</span>{" "}
                  <span className="text-slate-300">/api/v1/scan</span>
                  <span className="text-[#8B949E]">?target=example.com</span>
                </span>
              </div>
            </div>

            {/* Auth */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Authentication
              </h3>
              <p className="text-sm text-[#8B949E] mb-3">
                Include your API key in the{" "}
                <code className="text-xs bg-black px-1.5 py-0.5 rounded font-mono text-teal-400 border border-[rgba(48,54,61,0.9)]">
                  x-api-key
                </code>{" "}
                header. Set{" "}
                <code className="text-xs bg-black px-1.5 py-0.5 rounded font-mono text-teal-400 border border-[rgba(48,54,61,0.9)]">
                  PHISH_SLAYER_API_KEY
                </code>{" "}
                in your environment.
              </p>
            </div>

            {/* cURL Example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  cURL Example
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `curl -X GET "https://your-domain.com/api/v1/scan?target=example.com" -H "x-api-key: YOUR_API_KEY"`,
                    );
                    toast.success("Copied to clipboard!");
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <pre className="bg-black text-slate-300 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed border border-[rgba(48,54,61,0.9)]">
                {`curl -X GET \\
  "https://your-domain.com/api/v1/scan?target=example.com" \\
  -H "x-api-key: YOUR_API_KEY"`}
              </pre>
            </div>

            {/* POST Example */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
                POST Example
              </h3>
              <pre className="bg-black text-slate-300 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed border border-[rgba(48,54,61,0.9)]">
                {`curl -X POST "https://your-domain.com/api/v1/scan" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"target": "suspicious-domain.xyz"}'`}
              </pre>
            </div>

            {/* Response */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Response Format
              </h3>
              <pre className="bg-black text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed border border-[rgba(48,54,61,0.9)]">
                {`{
  "success": true,
  "data": {
    "target": "example.com",
    "verdict": "malicious",
    "risk_score": 85,
    "threat_category": "phishing",
    "ai_summary": "AI-generated threat analysis...",
    "malicious_count": 12,
    "total_engines": 70,
    "source": "virustotal",
    "scan_date": "2026-03-06T..."
  }
}`}
              </pre>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}


