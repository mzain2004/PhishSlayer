"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DecisionAuditRow = {
  id: string;
  action: "L1_AUTO_CLOSED" | "ALERT_ESCALATED";
  metadata: {
    reasoning?: string;
    confidence?: number;
  } | null;
  created_at: string;
};

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

export default function L1DecisionLog() {
  const [rows, setRows] = useState<DecisionAuditRow[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setErrorText(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("audit_logs")
          .select("id, action, metadata, created_at")
          .in("action", ["L1_AUTO_CLOSED", "ALERT_ESCALATED"])
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          throw new Error(error.message);
        }

        setRows((data || []) as DecisionAuditRow[]);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Unknown error");
      }
    };

    void load();
  }, []);

  return (
    <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">
        L1 Autonomous Decision Log
      </h2>

      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="text-sm text-white/50">No autonomous decisions yet.</p>
        ) : (
          rows.map((row) => {
            const escalated = row.action === "ALERT_ESCALATED";
            const confidence =
              typeof row.metadata?.confidence === "number"
                ? `${Math.round(row.metadata.confidence * 100)}% confidence`
                : "confidence unavailable";

            return (
              <div
                key={row.id}
                className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`text-[10px] uppercase tracking-[0.14em] font-semibold rounded-full px-2 py-1 border ${
                      escalated
                        ? "text-red-200 border-red-400/40 bg-red-500/20"
                        : "text-emerald-200 border-emerald-400/40 bg-emerald-500/20"
                    }`}
                  >
                    {escalated ? "ESCALATED" : "CLOSED"}
                  </span>
                  <span className="text-xs text-white/50">
                    {timeAgo(row.created_at)}
                  </span>
                </div>

                <p className="text-sm text-white/80 mt-2">
                  {row.metadata?.reasoning || "No reasoning captured."}
                </p>
                <p className="text-xs text-white/60 mt-1">{confidence}</p>
              </div>
            );
          })
        )}
      </div>

      {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
    </div>
  );
}
