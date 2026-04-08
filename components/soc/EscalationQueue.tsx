"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type EscalationRow = {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  recommended_action:
    | "CLOSE"
    | "ISOLATE_IDENTITY"
    | "BLOCK_IP"
    | "MANUAL_REVIEW";
  created_at: string;
};

function severityClass(severity: EscalationRow["severity"]): string {
  if (severity === "critical") {
    return "bg-red-500/20 text-red-300 border-red-400/40";
  }
  if (severity === "high") {
    return "bg-orange-500/20 text-orange-300 border-orange-400/40";
  }
  if (severity === "medium") {
    return "bg-yellow-500/20 text-yellow-300 border-yellow-400/40";
  }
  return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
}

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSeconds = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const mins = Math.floor(diffSeconds / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function EscalationQueue() {
  const [rows, setRows] = useState<EscalationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("escalations")
        .select("id, severity, title, recommended_action, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw new Error(error.message);
      }

      setRows((data || []) as EscalationRow[]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
    const intervalId = window.setInterval(() => {
      void loadQueue();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadQueue]);

  const patchStatus = async (id: string, action: "approve" | "dismiss") => {
    setBusyId(id);
    setErrorText(null);
    try {
      const response = await fetch(`/api/actions/escalate/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || `Failed to ${action} escalation`);
      }

      await loadQueue();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4 h-full">
      <h2 className="text-xl font-bold text-white">Escalation Queue</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queue...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-emerald-300">✅ No pending escalations</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.12em] border rounded-full px-2.5 py-1 ${severityClass(row.severity)}`}
                >
                  {row.severity}
                </span>
                <span className="text-xs text-white/60">
                  {timeAgo(row.created_at)}
                </span>
              </div>

              <p className="text-white font-semibold">{row.title}</p>

              <div className="text-xs uppercase tracking-[0.12em] text-cyan-300 border border-cyan-400/30 rounded-full px-2.5 py-1 w-fit">
                {row.recommended_action}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => patchStatus(row.id, "approve")}
                  disabled={busyId === row.id}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-black bg-[#2DD4BF] disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => patchStatus(row.id, "dismiss")}
                  disabled={busyId === row.id}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white bg-white/10 border border-white/20 disabled:opacity-60"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
    </div>
  );
}
