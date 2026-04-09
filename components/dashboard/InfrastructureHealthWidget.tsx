"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type ServiceState = "active" | "inactive";

type HealthResponse = {
  success: boolean;
  overall: "healthy" | "degraded" | "down";
  services: {
    "wazuh-manager": ServiceState;
    "wazuh-indexer": ServiceState;
    "wazuh-dashboard": ServiceState;
  };
  disk_percent: number;
  memory_percent: number;
  active_agents: number;
  auto_restarted: boolean;
};

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        active
          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
          : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
      }`}
    />
  );
}

function ProgressBar({ percent, dangerThreshold }: { percent: number; dangerThreshold: number }) {
  const isDanger = percent > dangerThreshold;

  return (
    <div className="w-full rounded-full bg-black/40 border border-[rgba(48,54,61,0.9)] h-2.5 overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${
          isDanger ? "bg-red-500" : "bg-[#2DD4BF]"
        }`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export default function InfrastructureHealthWidget() {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    try {
      const response = await fetch("/api/infrastructure/wazuh-health", {
        method: "GET",
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to fetch Wazuh health");
      }

      setHealth(payload as HealthResponse);
      setLastChecked(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();

    const interval = window.setInterval(
      () => {
        void fetchHealth();
      },
      5 * 60 * 1000,
    );

    return () => window.clearInterval(interval);
  }, [fetchHealth]);

  const lastCheckedLabel = useMemo(() => {
    if (!lastChecked) {
      return "Never";
    }

    const now = Date.now();
    const deltaSeconds = Math.floor((now - lastChecked.getTime()) / 1000);
    if (deltaSeconds < 60) {
      return `${deltaSeconds}s ago`;
    }

    const deltaMinutes = Math.floor(deltaSeconds / 60);
    if (deltaMinutes < 60) {
      return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    return `${deltaHours}h ago`;
  }, [lastChecked]);

  const managerActive = health?.services?.["wazuh-manager"] === "active";
  const indexerActive = health?.services?.["wazuh-indexer"] === "active";
  const dashboardActive = health?.services?.["wazuh-dashboard"] === "active";

  return (
    <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Wazuh Infrastructure Health</h2>
          <p className="text-xs text-white/50 mt-1">Last Checked: {lastCheckedLabel}</p>
        </div>

        <button
          type="button"
          onClick={() => void fetchHealth()}
          disabled={loading}
          className="rounded-full px-4 py-2 text-sm font-semibold text-black bg-gradient-to-r from-[#2DD4BF] to-[#22c55e] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Check Now
            </>
          )}
        </button>
      </div>

      {errorText ? (
        <p className="text-sm text-red-400">{errorText}</p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3 flex items-center justify-between">
          <span className="text-sm text-white/80">Wazuh Manager</span>
          <Dot active={managerActive} />
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3 flex items-center justify-between">
          <span className="text-sm text-white/80">Wazuh Indexer</span>
          <Dot active={indexerActive} />
        </div>
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3 flex items-center justify-between">
          <span className="text-sm text-white/80">Wazuh Dashboard</span>
          <Dot active={dashboardActive} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Active Agents</p>
          <p className="text-xl font-semibold text-white mt-1">{health?.active_agents ?? 0}</p>
        </div>

        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Disk Usage</p>
          <p className="text-sm text-white/90 mt-1 mb-2">{health?.disk_percent ?? 0}%</p>
          <ProgressBar percent={health?.disk_percent ?? 0} dangerThreshold={80} />
        </div>

        <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Memory Usage</p>
          <p className="text-sm text-white/90 mt-1 mb-2">{health?.memory_percent ?? 0}%</p>
          <ProgressBar percent={health?.memory_percent ?? 0} dangerThreshold={85} />
        </div>
      </div>

      <div className="text-xs text-white/50 flex items-center justify-between">
        <span>
          Overall: <strong className="text-white/90">{health?.overall ?? "unknown"}</strong>
        </span>
        <span>Auto-restarted: {health?.auto_restarted ? "yes" : "no"}</span>
      </div>
    </div>
  );
}
