"use client";

import { useState } from "react";
import { useHeuristicStore } from "@/lib/stores/heuristicStore";
import { useThreatStore } from "@/lib/stores/threatStore";
import {
  Brain,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface AIHeuristicsPanelProps {
  target: string;
  existingRiskScore: number;
}

export default function AIHeuristicsPanel({
  target,
  existingRiskScore,
}: AIHeuristicsPanelProps) {
  const {
    getResult,
    setResult,
    loading,
    setLoading,
    errors,
    setError,
    clearError,
  } = useHeuristicStore();
  const { deepScanData } = useThreatStore();
  const result = getResult(target);
  const isLoading = loading[target] || false;
  const error = errors[target] || null;

  const runAnalysis = async () => {
    if (!target) return;
    clearError(target);
    setLoading(target, true);

    try {
      // Get DOM text from deep scan data
      let domText = "";
      if (deepScanData?.domTree) {
        const dt = deepScanData.domTree as any;
        domText =
          dt.textContent || dt.bodyText || dt.rawHtml?.slice(0, 50000) || "";
      }

      if (!domText || domText.length < 10) {
        domText = `Target domain: ${target}. No DOM text available — analyze based on domain name patterns and known threat intelligence.`;
      }

      const res = await fetch("/api/threat/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domText, target, existingRiskScore }),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(target, data);
      toast.success("AI heuristic analysis complete");
    } catch (err: any) {
      setError(target, err.message || "Analysis failed");
      toast.error(err.message || "AI analysis failed");
    } finally {
      setLoading(target, false);
    }
  };

  const scoreColor = (score: number) => {
    if (score <= 3)
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score <= 7)
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  const riskColor = (score: number) => {
    if (score <= 30)
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score <= 70)
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  const confBadge = (c: string) => {
    switch (c) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-slate-500/10 text-[#8B949E] border-slate-500/20";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center animate-pulse">
            <Brain className="w-8 h-8 text-violet-400" />
          </div>
          <Loader2 className="absolute -top-1 -right-1 w-5 h-5 text-violet-400 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-white">
          Gemini is analyzing page content...
        </p>
        <p className="text-xs text-[#8B949E]">
          Scanning for manipulation tactics, credential harvesting, and
          deceptive patterns
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-sm font-semibold text-red-400">{error}</p>
        <button
          onClick={runAnalysis}
          className="rounded-full flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Analysis
        </button>
      </div>
    );
  }

  // Not yet analyzed state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-sm">
          <Brain className="w-10 h-10 text-violet-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">AI Heuristics Engine</h3>
          <p className="text-sm text-[#8B949E] mt-1 max-w-xs">
            Deep behavioral analysis of page content using Gemini AI
          </p>
        </div>
        <button
          onClick={runAnalysis}
          className="rounded-full flex items-center gap-2 px-6 py-3 bg-violet-600 text-white font-bold text-sm rounded-xl hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4" />
          Run AI Analysis
        </button>
      </div>
    );
  }

  // Results view
  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" />
          <h3 className="text-base font-bold text-white">
            AI Heuristics Engine
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
            Powered by Gemini
          </span>
        </div>
        <button
          onClick={runAnalysis}
          className="rounded-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-400 bg-violet-500/10 rounded-lg hover:bg-violet-500/20 border border-violet-500/20 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Re-analyze
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={`rounded-xl border p-4 ${scoreColor(result.heuristicScore)}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Heuristic Score
          </p>
          <p className="text-3xl font-black mt-1">
            {result.heuristicScore}
            <span className="text-lg">/10</span>
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 ${riskColor(result.combinedRiskScore)}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Combined Risk
          </p>
          <p className="text-3xl font-black mt-1">
            {result.combinedRiskScore}
            <span className="text-lg">/100</span>
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-[rgba(22,27,34,0.85)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
            Confidence
          </p>
          <div className="mt-2">
            <span
              className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${confBadge(result.confidence)}`}
            >
              {result.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* Manipulation Tactics */}
      <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-[rgba(22,27,34,0.85)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-orange-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Manipulation Tactics
          </h4>
        </div>
        {result.manipulationTactics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.manipulationTactics.map((t, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full"
              >
                ⚠️ {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-400 font-medium">
            ✓ No manipulation tactics detected
          </p>
        )}
      </div>

      {/* Credential Harvesting */}
      <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-[rgba(22,27,34,0.85)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-red-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Credential Harvesting Signals
          </h4>
        </div>
        {result.credentialHarvestingSignals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.credentialHarvestingSignals.map((s, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full"
              >
                🔴 {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-400 font-medium">
            ✓ No credential harvesting signals detected
          </p>
        )}
      </div>

      {/* Key Indicators */}
      <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-[rgba(22,27,34,0.85)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-[#8B949E]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Key Indicators
          </h4>
        </div>
        {result.indicators.length > 0 ? (
          <ul className="space-y-1.5">
            {result.indicators.map((ind, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#8B949E] mt-0.5 shrink-0" />
                {ind}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-emerald-400 font-medium">
            ✓ No suspicious indicators found
          </p>
        )}
      </div>

      {/* AI Summary */}
      <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-[rgba(22,27,34,0.85)] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B949E] mb-2">
          AI Threat Summary
        </h4>
        <p className="text-sm text-white/90 leading-relaxed">
          {result.summary}
        </p>
        <p className="text-[10px] text-[#8B949E] mt-3">
          Analyzed at: {new Date(result.analyzedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}


