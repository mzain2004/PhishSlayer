"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Severity = "critical" | "high" | "medium" | "low";
type Status = "new" | "triaging" | "escalated" | "ai_resolved" | "closed";

interface Alert {
  id: string;
  severity: Severity;
  attack_type: string;
  source_ip: string;
  status: Status;
  confidence_score: number;
  created_at: string;
  organization_id: string;
  affected_asset?: string;
}

const SEV_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const SEV_BG: Record<Severity, string> = {
  critical: "#ef444420",
  high: "#f9731620",
  medium: "#f59e0b20",
  low: "#22c55e20",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{ backgroundColor: SEV_BG[severity], color: SEV_COLORS[severity] }}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const configs: Record<Status, { label: string; className: string }> = {
    new: { label: "NEW", className: "bg-zinc-700 text-zinc-300" },
    triaging: { label: "TRIAGING", className: "bg-indigo-500/20 text-indigo-300 animate-pulse" },
    escalated: { label: "ESCALATED", className: "bg-amber-500/20 text-amber-300" },
    ai_resolved: { label: "AI RESOLVED", className: "bg-green-500/20 text-green-400" },
    closed: { label: "CLOSED", className: "bg-zinc-800 text-zinc-500" },
  };
  const c = configs[status] ?? configs.new;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.className}`}>
      {c.label}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-zinc-400">{pct}%</span>
    </div>
  );
}

function age(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterSev, setFilterSev] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [aiCollapsed, setAiCollapsed] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload) => {
          const a = payload.new as Alert;
          if (!a?.id) return;
          setAlerts((prev) => {
            const idx = prev.findIndex((x) => x.id === a.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = a;
              return next;
            }
            return [a, ...prev];
          });
          setFlashIds((prev) => {
            const next = new Set(prev);
            next.add(a.id);
            setTimeout(() => setFlashIds((p) => { const s = new Set(p); s.delete(a.id); return s; }), 300);
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAlerts = async () => {
    const resp = await fetch("/api/alerts");
    if (resp.ok) {
      const data = await resp.json();
      setAlerts(data.alerts ?? []);
    }
  };

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!filtered.length) return;
      if (e.key === "Escape") { setSelected(null); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => {
          const idx = filtered.findIndex((a) => a.id === prev);
          if (e.key === "ArrowDown") return filtered[Math.min(idx + 1, filtered.length - 1)].id;
          return filtered[Math.max(idx - 1, 0)].id;
        });
      }
      if (e.key === "Enter" && selected) {
        window.location.href = `/dashboard/alerts/${selected}`;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [alerts, selected]);

  const filtered = alerts.filter((a) => {
    if (filterSev !== "all" && a.severity !== filterSev) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !a.source_ip?.includes(q) &&
        !a.id.includes(q) &&
        !a.attack_type?.toLowerCase().includes(q) &&
        !a.affected_asset?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const active = filtered.filter((a) => a.status !== "ai_resolved");
  const aiResolved = filtered.filter((a) => a.status === "ai_resolved");

  const renderRow = (alert: Alert) => (
    <tr
      key={alert.id}
      onClick={() => setSelected(alert.id === selected ? null : alert.id)}
      className={`cursor-pointer border-b border-zinc-800 transition-colors ${
        selected === alert.id ? "bg-indigo-900/20" : "hover:bg-zinc-800/50"
      } ${flashIds.has(alert.id) ? "bg-indigo-900/40" : ""}`}
    >
      <td className="py-3 px-4">
        <SeverityBadge severity={alert.severity} />
      </td>
      <td className="py-3 px-4 text-sm text-zinc-300 font-medium">{alert.attack_type}</td>
      <td className="py-3 px-4 font-mono text-xs text-zinc-400">{alert.source_ip}</td>
      <td className="py-3 px-4">
        <StatusBadge status={alert.status} />
      </td>
      <td className="py-3 px-4">
        <ConfidenceBar score={alert.confidence_score ?? 0} />
      </td>
      <td className="py-3 px-4 text-xs text-zinc-500 font-mono">{age(alert.created_at)}</td>
    </tr>
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto" ref={containerRef}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Alert Queue</h1>
        <p className="text-xs text-zinc-500">↑↓ navigate · Enter open · Esc close</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search IP, asset, ID…"
          className="flex-1 min-w-48 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={filterSev}
          onChange={(e) => setFilterSev(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="triaging">Triaging</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Active alerts table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900">
            <tr>
              {["SEV", "ATTACK TYPE", "SOURCE IP", "STATUS", "CONFIDENCE", "AGE"].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {active.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 text-sm">
                  No active alerts matching filters
                </td>
              </tr>
            ) : (
              active.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {/* AI Resolved group */}
      {aiResolved.length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <button
            className="w-full flex items-center justify-between py-3 px-4 bg-zinc-900 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            onClick={() => setAiCollapsed((v) => !v)}
          >
            <span>AI Resolved ({aiResolved.length})</span>
            <span>{aiCollapsed ? "▶" : "▼"}</span>
          </button>
          {!aiCollapsed && (
            <table className="w-full">
              <tbody className="bg-zinc-950/50">{aiResolved.map(renderRow)}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
