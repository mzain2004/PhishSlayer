"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Ban,
  Download,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import AgentDashboard from "@/components/ui/agent-fleet/AgentDashboard";
import UpgradePrompt from "@/components/UpgradePrompt";
import {
  getEndpointEvents,
  getEndpointStats,
} from "@/lib/supabase/agentActions";
import type { EndpointEvent, EndpointStats } from "@/lib/supabase/agentQueries";
import { blockIp } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import PhishButton from "@/components/ui/PhishButton";
import StatusBadge from "@/components/dashboard/StatusBadge";

type TabKey = "fleet" | "monitor" | "events";

const ROWS_PER_PAGE = 20;
const BAR_COLORS = ["#0d9488", "#0ea5e9", "#f97316", "#ef4444", "#8b5cf6"];

const cardClass =
  "rounded-[12px] bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] backdrop-blur-[8px]";

const cardHover = {
  whileHover: {
    scale: 1.02,
    boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
  },
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

function threatLevelToStatus(level: string) {
  const l = level.toLowerCase();
  if (l === "critical" || l === "high") return "critical";
  if (l === "medium") return "warning";
  return "healthy";
}

export default function AgentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("fleet");
  const [events, setEvents] = useState<EndpointEvent[]>([]);
  const [stats, setStats] = useState<EndpointStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [blockingIp, setBlockingIp] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ev, st] = await Promise.all([
        getEndpointEvents(200),
        getEndpointStats(),
      ]);
      setEvents(ev);
      setStats(st);
    } catch {
      toast.error("Failed to load endpoint data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const verifyAccess = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const allowedRoles = ["manager", "admin", "super_admin"];
      if (!profile || !allowedRoles.includes(profile.role)) {
        router.replace("/dashboard");
        return;
      }

      setAuthChecked(true);
      void fetchData();
    };

    void verifyAccess();
  }, [router]);

  useEffect(() => {
    if (activeTab !== "events") {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel("agents-endpoint-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "endpoint_events" },
        () => {
          void fetchData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeTab, fetchData]);

  const handleRefresh = () => {
    setLoaded(false);
    void fetchData();
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
    a.download = `phish-slayer-endpoint-events-${new Date().toISOString().slice(0, 10)}.csv`;
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

  if (!authChecked || !loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="text-white font-sans min-h-screen flex flex-col w-full">
      <main
        data-stagger-container
        className="flex-1 w-full max-w-7xl mx-auto flex flex-col gap-6"
      >
        <UpgradePrompt
          requiredTier="pro"
          feature="Advanced endpoint fleet and live events"
        />
        <div className="rounded-full p-1 border border-[rgba(48,54,61,0.9)] bg-[rgba(23,28,35,0.9)] w-full max-w-2xl">
          <div className="grid grid-cols-3 gap-2">
            <PhishButton
              onClick={() => setActiveTab("fleet")}
              whileHover={{ opacity: 0.8 }}
              className={`rounded-full px-5 py-2 text-sm transition-all font-semibold ${
                activeTab === "fleet"
                  ? "[background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-black"
                  : "bg-transparent text-[rgba(255,255,255,0.5)]"
              }`}
            >
              Agent Fleet
            </PhishButton>
            <PhishButton
              onClick={() => setActiveTab("monitor")}
              whileHover={{ opacity: 0.8 }}
              className={`rounded-full px-5 py-2 text-sm transition-all font-semibold ${
                activeTab === "monitor"
                  ? "[background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-black"
                  : "bg-transparent text-[rgba(255,255,255,0.5)]"
              }`}
            >
              Endpoint Monitor
            </PhishButton>
            <PhishButton
              onClick={() => setActiveTab("events")}
              whileHover={{ opacity: 0.8 }}
              className={`rounded-full px-5 py-2 text-sm transition-all font-semibold ${
                activeTab === "events"
                  ? "[background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-black"
                  : "bg-transparent text-[rgba(255,255,255,0.5)]"
              }`}
            >
              Live Events
            </PhishButton>
          </div>
        </div>

        {activeTab === "fleet" && <AgentDashboard />}

        {activeTab === "monitor" && (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="dashboard-page-title text-white tracking-tight">
                  Endpoint Monitor
                </h1>
                <p className="text-[#8B949E] font-medium mt-1">
                  Real-time endpoint anomaly detection
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
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
                    placeholder="Filter by process, IP, level..."
                    className="w-56 py-2.5 pl-10 pr-5 rounded-full bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] text-sm text-[#E6EDF3] placeholder:text-white/50 focus:outline-none focus:border-[#2DD4BF] focus:shadow-[0_0_0_2px_rgba(45,212,191,0.2)]"
                  />
                </div>
                <PhishButton
                  onClick={handleRefresh}
                  whileHover={{ opacity: 0.8 }}
                  className="rounded-full flex items-center gap-2 border border-[rgba(48,54,61,0.9)] bg-[rgba(23,28,35,0.85)] px-5 py-2.5 text-sm font-semibold text-[#E6EDF3]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </PhishButton>
                <PhishButton
                  onClick={exportCsv}
                  whileHover={{ opacity: 0.8 }}
                  className="rounded-full flex items-center gap-2 border border-[rgba(48,54,61,0.9)] bg-[rgba(23,28,35,0.85)] px-5 py-2.5 text-sm font-semibold text-[#E6EDF3]"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </PhishButton>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div {...cardHover} className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#8B949E]">
                    Total Events
                  </p>
                  <Shield className="text-teal-400 w-5 h-5" />
                </div>
                <p className="dashboard-metric-value mt-2 text-white">
                  {stats?.total ?? 0}
                </p>
              </motion.div>
              <motion.div {...cardHover} className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#8B949E]">
                    Critical / High
                  </p>
                  <AlertTriangle className="text-red-400 w-5 h-5" />
                </div>
                <p className="dashboard-metric-value mt-2 text-red-500">
                  {(stats?.critical ?? 0) + (stats?.high ?? 0)}
                </p>
              </motion.div>
              <motion.div {...cardHover} className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#8B949E]">
                    Unique IPs
                  </p>
                  <Globe className="text-blue-400 w-5 h-5" />
                </div>
                <p className="dashboard-metric-value mt-2 text-white">
                  {stats?.uniqueIps ?? 0}
                </p>
              </motion.div>
              <motion.div {...cardHover} className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#8B949E]">
                    Processes Flagged
                  </p>
                  <Activity className="text-orange-400 w-5 h-5" />
                </div>
                <p className="dashboard-metric-value mt-2 text-white">
                  {stats?.topProcesses?.length ?? 0}
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                {...cardHover}
                className={`lg:col-span-2 ${cardClass} p-6`}
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
                    <p className="text-sm text-[#8B949E]">
                      No process data yet.
                    </p>
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
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                          fontWeight: 600,
                        }}
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

              <motion.div
                {...cardHover}
                className={`${cardClass} p-6 flex flex-col`}
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
                        BEACONING DETECTED - Possible C2 Communication
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
                          <span className="text-[#8B949E]"> -&gt; </span>
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
          </>
        )}

        {activeTab === "events" && (
          <motion.div {...cardHover} className={`${cardClass} overflow-hidden`}>
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
                          {countryFlag(e.country_code)} {e.country || "-"}
                          {e.city ? `, ${e.city}` : ""}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8B949E] truncate max-w-[120px]">
                          {e.isp || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={threatLevelToStatus(e.threat_level)}
                            label={e.threat_level}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {e.threat_score}
                            </span>
                            <div className="w-12 bg-white/10 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  e.threat_score >= 70
                                    ? "bg-red-500"
                                    : e.threat_score >= 50
                                      ? "bg-orange-400"
                                      : e.threat_score >= 30
                                        ? "bg-yellow-400"
                                        : "bg-emerald-500"
                                }`}
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
                            className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[rgba(23,28,35,0.85)]">
                <span className="text-xs text-[#8B949E]">
                  {filtered.length} events - Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <PhishButton
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="rounded-full px-3 py-1 border border-[rgba(48,54,61,0.9)] text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    Prev
                  </PhishButton>
                  <PhishButton
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-full px-3 py-1 border border-[rgba(48,54,61,0.9)] text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    Next
                  </PhishButton>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
