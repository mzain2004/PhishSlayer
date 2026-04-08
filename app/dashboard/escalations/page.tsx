"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EscalationStatus =
  | "pending"
  | "l2_pending_approval"
  | "l2_auto_resolved"
  | "approved"
  | "dismissed"
  | string;

type EscalationSeverity = "critical" | "high" | "medium" | "low" | string;

type EscalationRow = {
  id: string;
  title: string;
  description: string | null;
  severity: EscalationSeverity;
  status: EscalationStatus;
  affected_user_id: string | null;
  affected_ip: string | null;
  recommended_action: string | null;
  created_at: string;
  l2_function_called: string | null;
};

type StatusFilter = "all" | "pending" | "approved" | "dismissed";
type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

function getSeverityClasses(severity: EscalationSeverity): string {
  const key = severity.toLowerCase();
  if (key === "critical") return "bg-red-500/20 text-red-200 border-red-400/40";
  if (key === "high") return "bg-orange-500/20 text-orange-200 border-orange-400/40";
  if (key === "medium") return "bg-yellow-500/20 text-yellow-200 border-yellow-400/40";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
}

function getStatusClasses(status: EscalationStatus): string {
  const key = status.toLowerCase();
  if (key === "pending") return "bg-sky-500/20 text-sky-200 border-sky-400/40";
  if (key === "l2_pending_approval") {
    return "bg-purple-500/20 text-purple-200 border-purple-400/40";
  }
  if (key === "l2_auto_resolved") {
    return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
  }
  if (key === "dismissed") return "bg-slate-500/20 text-slate-200 border-slate-400/40";
  if (key === "approved") return "bg-cyan-500/20 text-cyan-200 border-cyan-400/40";
  return "bg-white/10 text-white border-white/20";
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

export default function EscalationsDashboardPage() {
  const [rows, setRows] = useState<EscalationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("escalations")
        .select(
          "id, title, description, severity, status, affected_user_id, affected_ip, recommended_action, created_at, l2_function_called",
        )
        .order("created_at", { ascending: false });

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
    void fetchEscalations();
  }, [fetchEscalations]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const status = row.status.toLowerCase();
      const severity = row.severity.toLowerCase();
      const search = searchText.trim().toLowerCase();

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "pending" && (status === "pending" || status === "l2_pending_approval")) ||
        (statusFilter === "approved" && (status === "approved" || status === "l2_auto_resolved")) ||
        (statusFilter === "dismissed" && status === "dismissed");

      const severityMatch =
        severityFilter === "all" || severity === severityFilter;

      const searchMatch =
        search.length === 0 ||
        row.title.toLowerCase().includes(search) ||
        (row.affected_ip || "").toLowerCase().includes(search);

      return statusMatch && severityMatch && searchMatch;
    });
  }, [rows, searchText, severityFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter(
      (row) => row.status === "pending" || row.status === "l2_pending_approval",
    ).length;
    const critical = rows.filter((row) => row.severity === "critical").length;
    const autoResolved = rows.filter(
      (row) => row.status === "l2_auto_resolved",
    ).length;

    return { total, pending, critical, autoResolved };
  }, [rows]);

  const patchEscalation = async (id: string, action: "approve" | "dismiss") => {
    setBusyId(id);
    setErrorText(null);
    try {
      const response = await fetch(`/api/actions/escalate/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Failed to ${action} escalation`);
      }

      await fetchEscalations();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white">
      <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4">
        <h1 className="text-2xl font-bold">SOC Escalations</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Total</p>
            <p className="text-lg font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Pending</p>
            <p className="text-lg font-semibold text-sky-300">{summary.pending}</p>
          </div>
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Critical</p>
            <p className="text-lg font-semibold text-red-300">{summary.critical}</p>
          </div>
          <div className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">L2 Auto-Resolved</p>
            <p className="text-lg font-semibold text-emerald-300">{summary.autoResolved}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search title or affected IP"
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl text-white/70">
          Loading escalations...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRows.map((row) => {
            const isActionable =
              row.status === "pending" || row.status === "l2_pending_approval";

            return (
              <div
                key={row.id}
                className="p-5 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold leading-tight">{row.title}</h2>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2 py-1 ${getSeverityClasses(row.severity)}`}>
                      {row.severity}
                    </span>
                    <span className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2 py-1 ${getStatusClasses(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-white/80">
                  {row.description || "No description provided."}
                </p>

                <div className="text-xs text-white/70 space-y-1">
                  <p>Affected User ID: {row.affected_user_id || "N/A"}</p>
                  <p>Affected IP: {row.affected_ip || "N/A"}</p>
                  <p>Recommended Action: {row.recommended_action || "N/A"}</p>
                  <p>Created: {relativeTime(row.created_at)}</p>
                </div>

                {row.l2_function_called ? (
                  <div className="w-fit text-xs font-mono text-cyan-200 border border-cyan-400/40 bg-cyan-500/10 rounded-full px-2 py-1">
                    {row.l2_function_called}
                  </div>
                ) : null}

                {isActionable ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => {
                        const confirmed = window.confirm(
                          `This will execute ${row.recommended_action || "the recommended action"} immediately. Confirm?`,
                        );
                        if (!confirmed) return;
                        void patchEscalation(row.id, "approve");
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-black bg-emerald-400 disabled:opacity-60"
                    >
                      Approve & Execute
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void patchEscalation(row.id, "dismiss")}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-white bg-red-500/80 disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
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