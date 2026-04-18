"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import DashboardCard from "@/components/dashboard/DashboardCard";

type ChainStatusResponse = {
  success: boolean;
  current_execution: {
    running: boolean;
    alert_id: string | null;
    started_at: string | null;
    elapsed_ms: number;
    stages_executed: string[];
  };
  last_execution: {
    alert_id: string;
    completed_at: string;
    total_duration_ms: number;
    stages_executed: string[];
    outcome: "SUCCESS" | "FAILED";
  } | null;
  success_rate_last_10: number;
  average_duration_ms: number;
  sample_size: number;
};

function formatMs(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0s";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = durationMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export default function AgentChainStatusWidget() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [data, setData] = useState<ChainStatusResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/metrics/agent-chain", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as ChainStatusResponse;
        if (!response.ok || !payload.success) {
          throw new Error("Failed to fetch chain metrics");
        }

        if (mounted) {
          setData(payload);
          setErrorText(null);
        }
      } catch (error) {
        if (mounted) {
          setErrorText(
            error instanceof Error ? error.message : "Failed to fetch status",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchStatus();
    const interval = window.setInterval(() => {
      void fetchStatus();
    }, 8000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const lastExecutionLabel = useMemo(() => {
    if (!data?.last_execution?.completed_at) {
      return "Never";
    }

    return new Date(data.last_execution.completed_at).toLocaleString();
  }, [data]);

  return (
    <DashboardCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="dashboard-section-heading text-white">
            Agent Chain Runtime
          </h2>
          <p className="text-xs text-white/50 mt-1">
            Last completed: {lastExecutionLabel}
          </p>
        </div>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-xs text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading
          </div>
        ) : null}
      </div>

      {errorText ? (
        <p className="text-sm text-red-400">{errorText}</p>
      ) : (
        <>
          <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
            <p className="dashboard-card-label">Current Chain Execution</p>
            {data?.current_execution?.running ? (
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <p>Alert: {data.current_execution.alert_id || "unknown"}</p>
                <p>Running: {formatMs(data.current_execution.elapsed_ms)}</p>
                <p>
                  Stages:{" "}
                  {data.current_execution.stages_executed.join(" -> ") || "L1"}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/50">No chain running.</p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
              <p className="dashboard-card-label">Last Duration</p>
              <p className="dashboard-metric-value text-white">
                {formatMs(data?.last_execution?.total_duration_ms || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
              <p className="dashboard-card-label">Last Outcome</p>
              <p
                className={`dashboard-metric-value ${
                  data?.last_execution?.outcome === "FAILED"
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {data?.last_execution?.outcome || "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
              <p className="dashboard-card-label">Success Rate (10)</p>
              <p className="dashboard-metric-value text-white">
                {Math.round((data?.success_rate_last_10 || 0) * 100)}%
              </p>
            </div>
            <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3">
              <p className="dashboard-card-label">Avg Duration</p>
              <p className="dashboard-metric-value text-white">
                {formatMs(data?.average_duration_ms || 0)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(48,54,61,0.9)] bg-black/20 p-3 text-sm text-white/70">
            Stages from last run:{" "}
            {data?.last_execution?.stages_executed.join(" -> ") || "N/A"}
          </div>
        </>
      )}
    </DashboardCard>
  );
}
