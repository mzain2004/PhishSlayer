"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

type EscalationStatus =
  | "pending"
  | "awaiting_human"
  | "auto_resolved"
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

function severityToBadgeStatus(severity: EscalationSeverity) {
  const key = severity.toLowerCase();
  if (key === "critical" || key === "high") return "critical";
  if (key === "medium") return "warning";
  return "healthy";
}

function escalationToBadgeStatus(status: EscalationStatus) {
  const key = status.toLowerCase();
  if (
    key === "approved" ||
    key === "l2_auto_resolved" ||
    key === "auto_resolved"
  )
    return "healthy";
  if (key === "dismissed") return "warning";
  if (key === "escalated") return "escalated";
  return "pending";
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
        (statusFilter === "pending" &&
          ["pending", "l2_pending_approval", "awaiting_human"].includes(
            status,
          )) ||
        (statusFilter === "approved" &&
          ["approved", "l2_auto_resolved", "auto_resolved"].includes(status)) ||
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
    const pending = rows.filter((row) =>
      ["pending", "l2_pending_approval", "awaiting_human"].includes(row.status),
    ).length;
    const critical = rows.filter((row) => row.severity === "critical").length;
    const autoResolved = rows.filter((row) =>
      ["l2_auto_resolved", "auto_resolved"].includes(row.status),
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
      <DashboardCard className="flex flex-col gap-4">
        <h2 className="dashboard-section-heading text-white">
          SOC Escalations
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Total</p>
            <p className="dashboard-metric-value">{summary.total}</p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Pending</p>
            <p className="dashboard-metric-value text-sky-300">
              {summary.pending}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Critical</p>
            <p className="dashboard-metric-value text-red-300">
              {summary.critical}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">L2 Auto-Resolved</p>
            <p className="dashboard-metric-value text-emerald-300">
              {summary.autoResolved}
            </p>
          </DashboardCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="dismissed">Dismissed</option>
          </select>

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

          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search title or affected IP"
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          />
        </div>
      </DashboardCard>

      {loading ? (
        <DashboardCard className="text-white/70">
          Loading escalations...
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRows.map((row) => {
            const isActionable = [
              "pending",
              "l2_pending_approval",
              "awaiting_human",
            ].includes(row.status);

            return (
              <DashboardCard key={row.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="dashboard-section-heading leading-tight">
                    {row.title}
                  </h3>
                  <div className="flex flex-col gap-2 items-end">
                    <StatusBadge
                      status={severityToBadgeStatus(row.severity)}
                      label={row.severity}
                    />
                    <StatusBadge
                      status={escalationToBadgeStatus(row.status)}
                      label={row.status}
                    />
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
                  <StatusBadge
                    status="escalated"
                    label={row.l2_function_called}
                  />
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
              </DashboardCard>
            );
          })}
        </div>
      )}

      {errorText ? (
        <DashboardCard className="border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          {errorText}
        </DashboardCard>
      ) : null}
    </div>
  );
}
