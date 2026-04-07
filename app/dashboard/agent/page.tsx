"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  AlertTriangle,
  Globe,
  Activity,
  ChevronRight,
  Loader2,
  Search,
  Download,
  RefreshCw,
  Terminal,
  Ban,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getEndpointEvents,
  getEndpointStats,
} from "@/lib/supabase/agentActions";
import { blockIp } from "@/lib/supabase/actions";
import type { EndpointEvent, EndpointStats } from "@/lib/supabase/agentQueries";
import PhishButton from "@/components/ui/PhishButton";

const ROWS_PER_PAGE = 20;
const BAR_COLORS = ["#0d9488", "#0ea5e9", "#f97316", "#ef4444", "#8b5cf6"];

const cardHover = {
  whileHover: {
    scale: 1.02,
    boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
  },
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  );
}

function threatBadge(level: string) {
  const l = level.toLowerCase();
  if (l === "critical") return "bg-red-500/10 text-red-500 border-red-500/20";
  if (l === "high")
    return "bg-orange-500/10 text-orange-500 border-orange-500/20";
  if (l === "medium")
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
}

export default function AgentDashboardPage() {
  const [events, setEvents] = useState<EndpointEvent[]>([]);
  const [stats, setStats] = useState<EndpointStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async () => {
    try {
      const [ev, st] = await Promise.all([
        getEndpointEvents(200),
        getEndpointStats(),
      ]);
      setEvents(ev);
      setStats(st);
    } catch {
      toast.error("Failed to load agent data.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setLoaded(false);
    fetchData();
  };

  const handleBlockIp = (ip: string) => {
    setBlockingIp(ip);
    startTransition(async () => {
      try {
        await blockIp(ip);
        toast.success(`IP ${ip} blocked and added to Intel Vault.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Block failed";
        toast.error(msg);
      } finally {
        setBlockingIp(null);
      }
    });
  };

  const exportCsv = () => {
    if (events.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const headers = [
      "Timestamp",
      "Process",
      "PID",
      "Remote IP",
      "Port",
      "Country",
      "City",
      "ISP",
      "Threat Level",
      "Score",
    ];
    const rows = events.map((e) => [
      e.timestamp,
      e.process_name,
      e.pid,
      e.remote_address,
      e.remote_port,
      e.country || "",
      e.city || "",
      e.isp || "",
      e.threat_level,
      e.threat_score,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phish-slayer-agent-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  const filtered = useMemo(() => {
    if (!filter) return events;
    const q = filter.toLowerCase();
    return events.filter(
      (e) =>
        e.process_name.toLowerCase().includes(q) ||
        e.remote_address.includes(q) ||
        e.threat_level.toLowerCase().includes(q) ||
        (e.country || "").toLowerCase().includes(q),
    );
  }, [events, filter]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paged = filtered.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE,
  );

  const beaconingEvents = useMemo(
    () =>
      events.filter(
        (e) => (e.raw_event as Record<string, unknown>)?.isBeaconing === true,
      ),
    [events],
  );

  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div style={{ color: "#8B949E" }}>Loading...</div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="text-white font-sans min-h-screen flex flex-col w-full">
      <main data-stagger-container className="flex-1 px-4 sm:px-8 py-8 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[#8B949E] mb-4">
            <a
              className="hover:text-teal-500 transition-colors"
              href="/dashboard"
            >
              Dashboard
            </a>
            <ChevronRight className="w-4 h-4 text-[#8B949E]" />
            <span className="text-white font-medium">Endpoint Agent</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Endpoint Agent
                </h1>
                {stats && stats.total > 0 && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                  </span>
                )}
              </div>
              <p className="text-[#8B949E] font-medium mt-1">
                Real-time endpoint anomaly detection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8B949E]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Filter by process, IP, level…"
                  className="w-56 py-2.5 pl-10 pr-5 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] text-sm text-[#E6EDF3] placeholder:text-white/50 focus:outline-none focus:border-[#2DD4BF] focus:shadow-[0_0_0_2px_rgba(45,212,191,0.2)]"
                />
              </div>
              <PhishButton
                onClick={handleRefresh}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-5 py-2.5 text-sm font-semibold text-[#E6EDF3]"
              >
                <RefreshCw
                  className={`w-4 h-4 ${!loaded ? "animate-spin" : ""}`}
                />
                Refresh
              </PhishButton>
              <PhishButton
                onClick={exportCsv}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-5 py-2.5 text-sm font-semibold text-[#E6EDF3]"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </PhishButton>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            {...cardHover}
            className="flex flex-col gap-1 rounded-[12px] bg-[rgba(23,28,35,0.88)] p-5 border border-[rgba(48,54,61,0.9)] backdrop-blur-[8px]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B949E]">Total Events</p>
              <Shield className="text-teal-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {stats?.total ?? 0}
            </p>
          </motion.div>
          <motion.div
            {...cardHover}
            className="flex flex-col gap-1 rounded-[12px] bg-[rgba(23,28,35,0.88)] p-5 border border-[rgba(48,54,61,0.9)] backdrop-blur-[8px]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B949E]">
                Critical / High
              </p>
              <AlertTriangle className="text-red-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-red-500 mt-2">
              {(stats?.critical ?? 0) + (stats?.high ?? 0)}
            </p>
          </motion.div>
          <motion.div
            {...cardHover}
            className="flex flex-col gap-1 rounded-[12px] bg-[rgba(23,28,35,0.88)] p-5 border border-[rgba(48,54,61,0.9)] backdrop-blur-[8px]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B949E]">Unique IPs</p>
              <Globe className="text-blue-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {stats?.uniqueIps ?? 0}
            </p>
          </motion.div>
          <motion.div
            {...cardHover}
            className="flex flex-col gap-1 rounded-[12px] bg-[rgba(23,28,35,0.88)] p-5 border border-[rgba(48,54,61,0.9)] backdrop-blur-[8px]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B949E]">
                Processes Flagged
              </p>
              <Activity className="text-orange-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {stats?.topProcesses?.length ?? 0}
            </p>
          </motion.div>
        </div>

        {/* Charts + Beaconing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart */}
          <motion.div
            {...cardHover}
            className="lg:col-span-2 bg-[rgba(23,28,35,0.88)] border border-[rgba(48,54,61,0.9)] rounded-2xl p-6 backdrop-blur-[8px]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Top Processes
              </h3>
            </div>
            {(stats?.topProcesses?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center">
                <Activity className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm text-[#8B949E]">No process data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={stats!.topProcesses}
                  margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                    {stats!.topProcesses.map((_e, i) => (
                      <Cell
                        key={i}
                        fill={BAR_COLORS[i % BAR_COLORS.length]}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Beaconing Alert */}
          <motion.div
            {...cardHover}
            className="bg-[rgba(23,28,35,0.88)] border border-[rgba(48,54,61,0.9)] rounded-2xl p-6 backdrop-blur-[8px] flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Beaconing Detection
              </h3>
            </div>
            {beaconingEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Shield className="w-8 h-8 text-emerald-500/50 mb-2" />
                <p className="text-sm text-emerald-400 font-semibold">
                  No beaconing detected
                </p>
                <p className="text-xs text-[#8B949E] mt-1">
                  Monitoring for C2 patterns
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs font-black text-red-400 uppercase">
                    ⚠️ BEACONING DETECTED — Possible C2 Communication
                  </p>
                </div>
                <ul className="space-y-2 overflow-y-auto max-h-40">
                  {beaconingEvents.map((e, i) => (
                    <li
                      key={i}
                      className="text-xs bg-[rgba(23,28,35,0.85)] rounded p-2 border border-[rgba(48,54,61,0.9)]"
                    >
                      <span className="font-mono font-bold text-red-400">
                        {e.process_name}
                      </span>
                      <span className="text-[#8B949E]"> → </span>
                      <span className="font-mono text-slate-300">
                        {e.remote_address}:{e.remote_port}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </div>

        {/* Events Table */}
        <motion.div
          {...cardHover}
          className="rounded-xl bg-[rgba(15,23,42,0.58)] shadow-sm border border-[rgba(45,212,191,0.14)] overflow-hidden mb-8"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[rgba(23,28,35,0.85)] border-b border-white/10">
                  {[
                    "Timestamp",
                    "Process",
                    "PID",
                    "Remote IP",
                    "Port",
                    "Location",
                    "ISP",
                    "Level",
                    "Score",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-sm text-[#8B949E]"
                    >
                      No endpoint events found.
                    </td>
                  </tr>
                ) : (
                  paged.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-white/10 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-[#8B949E] whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-white">
                        {e.process_name}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#8B949E]">
                        {e.pid}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-white">
                        {e.remote_address}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#8B949E]">
                        {e.remote_port}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8B949E] whitespace-nowrap">
                        {countryFlag(e.country_code)} {e.country || "—"}
                        {e.city ? `, ${e.city}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8B949E] truncate max-w-[120px]">
                        {e.isp || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${threatBadge(e.threat_level)}`}
                        >
                          {e.threat_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {e.threat_score}
                          </span>
                          <div className="w-12 bg-white/10 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${e.threat_score >= 70 ? "bg-red-500" : e.threat_score >= 50 ? "bg-orange-400" : e.threat_score >= 30 ? "bg-yellow-400" : "bg-emerald-500"}`}
                              style={{
                                width: `${Math.min(e.threat_score, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PhishButton
                          onClick={() => handleBlockIp(e.remote_address)}
                          disabled={
                            isPending && blockingIp === e.remote_address
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                        >
                          {isPending && blockingIp === e.remote_address ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Ban className="w-3 h-3" />
                          )}
                          Block
                        </PhishButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[rgba(23,28,35,0.85)]">
              <span className="text-xs text-[#8B949E]">
                {filtered.length} events · Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <PhishButton
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded border border-[rgba(48,54,61,0.9)] text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  Prev
                </PhishButton>
                <PhishButton
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded border border-[rgba(48,54,61,0.9)] text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  Next
                </PhishButton>
              </div>
            </div>
          )}
        </motion.div>

        {/* Agent Configuration */}
        <div className="rounded-xl bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] overflow-hidden shadow-sm">
          <div className="bg-black px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
              Agent Configuration
            </span>
          </div>
          <div className="p-5 font-mono text-xs text-slate-300 space-y-4">
            <div>
              <p className="text-teal-400 font-bold mb-1"># Start the agent</p>
              <p className="text-slate-100 bg-white/10 rounded px-3 py-2">
                npx ts-node lib/agent/endpointMonitor.ts
              </p>
            </div>
            <div>
              <p className="text-teal-400 font-bold mb-1">
                # Required environment variables
              </p>
              <p className="text-[#8B949E]">
                NEXT_PUBLIC_SITE_URL=
                <span className="text-emerald-400">
                  {typeof window !== "undefined"
                    ? window.location.origin
                    : "http://localhost:3000"}
                </span>
              </p>
              <p className="text-[#8B949E]">
                AGENT_SECRET=
                <span className="text-emerald-400">your_agent_secret_here</span>
              </p>
            </div>
            <div>
              <p className="text-teal-400 font-bold mb-1">
                # osquery SQL (auto-executed by agent)
              </p>
              <pre className="text-[#8B949E] bg-white/10 rounded px-3 py-2 whitespace-pre-wrap">
                {`SELECT p.name, p.pid, pos.remote_address, pos.remote_port
FROM process_open_sockets pos
JOIN processes p ON pos.pid = p.pid
WHERE pos.remote_address != ''
  AND pos.remote_address NOT LIKE '192.168.%'
  AND pos.remote_address NOT LIKE '10.%';`}
              </pre>
            </div>
            <div>
              <p className="text-teal-400 font-bold mb-1"># API Endpoint</p>
              <p className="text-[#8B949E]">
                POST{" "}
                <span className="text-emerald-400">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  /api/flag-ioc
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
