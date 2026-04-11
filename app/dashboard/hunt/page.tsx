"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { List, RowComponentProps } from "react-window";

type HuntFindingRow = {
  id: string;
  hunt_type: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical" | string;
  confidence: number;
  escalated: boolean;
  escalation_id: string | null;
  created_at: string;
};

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";
type EscalationFilter = "all" | "escalated" | "not_escalated";

type RowProps = {
  rows: HuntFindingRow[];
};

function severityClasses(severity: string): string {
  const value = severity.toLowerCase();
  if (value === "critical")
    return "bg-red-500/20 text-red-200 border-red-400/40";
  if (value === "high")
    return "bg-orange-500/20 text-orange-200 border-orange-400/40";
  if (value === "medium")
    return "bg-yellow-500/20 text-yellow-200 border-yellow-400/40";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));

  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ThreatHuntsPage() {
  const [rows, setRows] = useState<HuntFindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [escalationFilter, setEscalationFilter] =
    useState<EscalationFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("hunt_findings")
        .select(
          "id, hunt_type, title, description, severity, confidence, escalated, escalation_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        throw new Error(error.message);
      }

      setRows((data || []) as HuntFindingRow[]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFindings();

    const supabase = createClient();
    const channel = supabase
      .channel("hunt-findings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hunt_findings" },
        () => {
          void fetchFindings();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchFindings]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchText]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const severity = row.severity.toLowerCase();
      const search = debouncedSearchText.trim().toLowerCase();

      const severityMatch =
        severityFilter === "all" || severity === severityFilter;

      const escalationMatch =
        escalationFilter === "all" ||
        (escalationFilter === "escalated" && row.escalated) ||
        (escalationFilter === "not_escalated" && !row.escalated);

      const searchMatch =
        search.length === 0 ||
        row.title.toLowerCase().includes(search) ||
        row.hunt_type.toLowerCase().includes(search);

      return severityMatch && escalationMatch && searchMatch;
    });
  }, [rows, escalationFilter, debouncedSearchText, severityFilter]);

  const CardRow = ({ index, style, rows }: RowComponentProps<RowProps>) => {
    const row = rows[index];

    return (
      <div style={style} className="px-2 pb-4">
        <div className="h-full p-5 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-tight">{row.title}</h2>
            <span
              className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2 py-1 ${severityClasses(row.severity)}`}
            >
              {row.severity}
            </span>
          </div>

          <p className="text-sm text-white/80">
            {row.description || "No description provided."}
          </p>

          <div className="text-xs text-white/70 space-y-1">
            <p>Hunt Type: {row.hunt_type}</p>
            <p>Confidence: {(row.confidence * 100).toFixed(1)}%</p>
            <p>Escalated: {row.escalated ? "Yes" : "No"}</p>
            <p>Created: {relativeTime(row.created_at)}</p>
          </div>

          {row.escalation_id ? (
            <div className="w-fit text-xs font-mono text-cyan-200 border border-cyan-400/40 bg-cyan-500/10 rounded-full px-2 py-1">
              escalation: {row.escalation_id}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const summary = useMemo(() => {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24h = rows.filter((row) => row.created_at >= sinceIso);

    return {
      total: rows.length,
      last24h: last24h.length,
      escalated: rows.filter((row) => row.escalated).length,
      critical: rows.filter((row) => row.severity.toLowerCase() === "critical")
        .length,
    };
  }, [rows]);

  return (
    <div className="flex flex-col gap-6 text-white">
      <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Threat Hunts</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              Total Findings
            </p>
            <p className="text-lg font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              Last 24h
            </p>
            <p className="text-lg font-semibold text-violet-300">
              {summary.last24h}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              Escalated
            </p>
            <p className="text-lg font-semibold text-cyan-300">
              {summary.escalated}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
              Critical
            </p>
            <p className="text-lg font-semibold text-red-300">
              {summary.critical}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value as SeverityFilter)
            }
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={escalationFilter}
            onChange={(event) =>
              setEscalationFilter(event.target.value as EscalationFilter)
            }
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            <option value="all">All Escalation States</option>
            <option value="escalated">Escalated</option>
            <option value="not_escalated">Not Escalated</option>
          </select>

          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search title or hunt type"
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl text-white/70">
          Loading hunt findings...
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl text-white/70">
          No findings match your filters.
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgba(48,54,61,0.9)] bg-[rgba(23,28,35,0.85)] p-2">
          <List
            rowCount={filteredRows.length}
            rowHeight={242}
            rowComponent={CardRow}
            rowProps={{ rows: filteredRows }}
            style={{ height: 680 }}
          />
        </div>
      )}

      {errorText ? (
        <div className="p-4 rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 text-sm">
          {errorText}
        </div>
      ) : null}
    </div>
  );
}
