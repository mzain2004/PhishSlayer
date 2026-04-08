"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tier0AuditRow = {
  id: string;
  created_at: string;
  metadata: {
    rule_triggered?: string;
    scan_url?: string;
    ip?: string;
    destination_ip?: string;
  } | null;
};

export default function Tier0BlockFeed() {
  const [rows, setRows] = useState<Tier0AuditRow[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setErrorText(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, metadata")
        .eq("action", "TIER0_BLOCK")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw new Error(error.message);
      }

      setRows((data || []) as Tier0AuditRow[]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    void loadFeed();
    const intervalId = window.setInterval(() => {
      void loadFeed();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [loadFeed]);

  return (
    <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4 h-full">
      <h2 className="text-xl font-bold text-white">Tier 0 Auto-Block Feed</h2>

      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-white/50">
            No Tier 0 blocks recorded yet.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 p-3 flex items-start gap-3"
            >
              <ShieldAlert className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-300">
                  {row.metadata?.rule_triggered || "UNKNOWN_RULE"}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {row.metadata?.scan_url ||
                    row.metadata?.ip ||
                    row.metadata?.destination_ip ||
                    "Unknown target"}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-red-200 border border-red-400/40 bg-red-500/20 rounded-full px-2 py-1">
                BLOCKED
              </span>
            </div>
          ))
        )}
      </div>

      {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
    </div>
  );
}
