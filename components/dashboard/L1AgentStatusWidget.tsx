"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DashboardCard from "@/components/dashboard/DashboardCard";

type Decision = "CLOSE" | "ESCALATE";
type Severity = "low" | "medium" | "high" | "critical";

type ResultRow = {
  scan_id: string;
  decision: Decision;
  confidence: number;
  severity: Severity;
  reasoning: string;
};

type RunSummary = {
  success: boolean;
  processed: number;
  closed: number;
  escalated: number;
  errors: number;
  results: ResultRow[];
  ranAt: string;
};

const STORAGE_KEY = "l1_agent_last_run";

function getDecisionColor(decision: Decision) {
  return decision === "CLOSE" ? "text-emerald-400" : "text-red-400";
}

export default function L1AgentStatusWidget() {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [liveResults, setLiveResults] = useState<ResultRow[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as RunSummary;
      setLastRun(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const lastRunLabel = useMemo(() => {
    if (!lastRun?.ranAt) {
      return "Never";
    }

    return new Date(lastRun.ranAt).toLocaleString();
  }, [lastRun]);

  const runL1Triage = async () => {
    setLoading(true);
    setErrorText(null);
    setLiveResults([]);

    try {
      const response = await fetch("/api/agent/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to run triage agent.");
      }

      const summary: RunSummary = {
        success: Boolean(payload.success),
        processed: Number(payload.processed || 0),
        closed: Number(payload.closed || 0),
        escalated: Number(payload.escalated || 0),
        errors: Number(payload.errors || 0),
        results: Array.isArray(payload.results) ? payload.results : [],
        ranAt: new Date().toISOString(),
      };

      setLastRun(summary);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));

      // Render lines progressively to create a live run log effect.
      for (const result of summary.results) {
        setLiveResults((previous) => [...previous, result]);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="dashboard-section-heading text-white">
            L1 Autonomous Triage
          </h2>
          <p className="text-xs text-white/50 mt-1">Last Run: {lastRunLabel}</p>
        </div>

        <button
          type="button"
          onClick={runL1Triage}
          disabled={loading}
          className="rounded-full px-4 py-2 text-sm font-semibold text-black bg-gradient-to-r from-[#2DD4BF] to-[#22c55e] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            "Run L1 Triage Now"
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="dashboard-card-label">Processed</p>
          <p className="dashboard-metric-value text-white">
            {lastRun?.processed ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="dashboard-card-label">Closed</p>
          <p className="dashboard-metric-value text-emerald-400">
            {lastRun?.closed ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="dashboard-card-label">Escalated</p>
          <p className="dashboard-metric-value text-red-400">
            {lastRun?.escalated ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="dashboard-card-label">Errors</p>
          <p className="dashboard-metric-value text-amber-400">
            {lastRun?.errors ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3 col-span-2 md:col-span-1">
          <p className="dashboard-card-label">Success</p>
          <p className="dashboard-metric-value text-white">
            {lastRun?.success ? "true" : "false"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
          Live Run Log
        </p>

        {errorText ? (
          <p className="text-sm text-red-400">{errorText}</p>
        ) : liveResults.length === 0 ? (
          <p className="text-sm text-white/40">No live run data yet.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {liveResults.map((row) => (
              <div
                key={`${row.scan_id}-${row.decision}-${row.confidence}`}
                className="text-sm border border-white/5 bg-white/5 rounded-md px-3 py-2"
              >
                <p
                  className={`font-semibold ${getDecisionColor(row.decision)}`}
                >
                  [{row.decision}] {row.scan_id}
                </p>
                <p className="text-white/80">{row.reasoning}</p>
                <p className="text-xs text-white/50">
                  Severity: {row.severity} | Confidence:{" "}
                  {row.confidence.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
