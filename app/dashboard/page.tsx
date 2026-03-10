"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  ShieldAlert,
  Radar,
  AlertTriangle,
  Database,
  CheckCircle2,
  Clock,
  Activity,
  Crosshair,
  Eye,
} from "lucide-react";
import {
  getIncidents,
  getScans,
  getIntelIndicators,
} from "@/lib/supabase/actions";
import { getRecentCriticalEvents } from "@/lib/supabase/agentActions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ScanRecord = {
  target: string;
  status: string;
  date: string;
  verdict?: string;
  risk_score?: number;
  threat_category?: string;
  ai_summary?: string;
};

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Data
  const [totalScans, setTotalScans] = useState(0);
  const [maliciousScans, setMaliciousScans] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);
  const [intelVaultSize, setIntelVaultSize] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [categoryData, setCategoryData] = useState<
    { name: string; count: number }[]
  >([]);

  // Extra derived
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [avgRisk, setAvgRisk] = useState(0);
  const [agentCriticalCount, setAgentCriticalCount] = useState(0);

  useEffect(() => {
    getRecentCriticalEvents(50)
      .then((evts) => setAgentCriticalCount(evts.length))
      .catch(() => {});

    Promise.all([getIncidents(), getScans(), getIntelIndicators()])
      .then(([incidents, scans, intel]) => {
        const scanArr = scans as ScanRecord[];
        setTotalScans(scanArr.length);
        setMaliciousScans(
          scanArr.filter((s) => s.verdict?.toLowerCase() === "malicious")
            .length,
        );
        setTotalIncidents(incidents.length);
        const open = incidents.filter(
          (i: any) => !i.status?.toLowerCase().includes("resolved"),
        );
        setActiveIncidents(open.length);
        setResolvedCount(
          incidents.filter((i: any) =>
            i.status?.toLowerCase().includes("resolved"),
          ).length,
        );
        setIntelVaultSize(intel.length);

        const scores = incidents
          .map((i: any) => i.risk_score)
          .filter((s: any) => typeof s === "number");
        setAvgRisk(
          scores.length
            ? Math.round(
                scores.reduce((a: number, b: number) => a + b, 0) /
                  scores.length,
              )
            : 0,
        );

        // Recent Scans (last 5)
        const sorted = [...scanArr].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setRecentScans(sorted.slice(0, 5));

        // Threats by Category
        const cats: Record<string, number> = {};
        scanArr
          .filter((s) => s.threat_category && s.threat_category !== "Unknown")
          .forEach((s) => {
            const c = s.threat_category!;
            cats[c] = (cats[c] || 0) + 1;
          });
        const catArr = Object.entries(cats)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setCategoryData(catArr);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const scoreIndex = loaded ? Math.max(0, 100 - avgRisk) : 0;
  const postureDelta =
    totalIncidents > 0
      ? `+${((resolvedCount / totalIncidents) * 100).toFixed(1)}%`
      : "+0.0%";

  const Metric = ({ value }: { value: string | number }) =>
    !loaded ? (
      <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
    ) : (
      <>{value}</>
    );

  const verdictColor = (v?: string) => {
    const lv = v?.toLowerCase();
    if (lv === "malicious") return "border-red-500";
    if (lv === "suspicious") return "border-yellow-500";
    return "border-green-500";
  };
  const verdictBadge = (v?: string) => {
    const lv = v?.toLowerCase();
    if (lv === "malicious")
      return "text-red-400 bg-red-500/10 border-red-500/20";
    if (lv === "suspicious")
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-green-400 bg-green-500/10 border-green-500/20";
  };

  return (
    <>
      <div className="relative flex-1 flex flex-col p-6 md:p-8 bg-transparent min-h-full w-full pb-24">
        {/* Header */}
        <header className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-white text-3xl font-bold tracking-tighter">
              Command Center
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Enterprise Security Posture — God&apos;s Eye View
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Network Integrity
              </span>
              <span
                className={`font-semibold ${
                  !loaded
                    ? "text-slate-500"
                    : activeIncidents === 0
                      ? "text-emerald-400"
                      : activeIncidents <= 5
                        ? "text-yellow-400"
                        : "text-red-400"
                }`}
              >
                {!loaded ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : activeIncidents === 0 ? (
                  "Resilient"
                ) : activeIncidents <= 5 ? (
                  "Stable"
                ) : (
                  "At Risk"
                )}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  router.push(
                    `/dashboard/scans?search=${encodeURIComponent(searchQuery.trim())}`,
                  );
                }
              }}
              className="relative flex items-center"
            >
              <div
                className={`flex items-center bg-slate-950/50 backdrop-blur-md border border-white/10 transition-all rounded-full overflow-hidden ${
                  isSearchExpanded
                    ? "w-64 px-4 focus-within:ring-2 focus-within:ring-teal-500/50 focus-within:border-teal-500"
                    : "w-12 hover:bg-white/5"
                } h-12`}
              >
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className={`flex items-center justify-center shrink-0 ${isSearchExpanded ? "text-teal-400" : "text-slate-400 w-full h-full"}`}
                >
                  <Search className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Search IP or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchExpanded(true)}
                  onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                  className={`bg-transparent outline-none text-sm text-white placeholder-slate-500 transition-all ${
                    isSearchExpanded
                      ? "w-full ml-3 opacity-100"
                      : "w-0 opacity-0"
                  }`}
                />
              </div>
            </form>

            <button
              onClick={() => router.push("/dashboard/incidents")}
              className="px-6 h-12 rounded-full bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              Intervene
            </button>
          </div>
        </header>

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Scans */}
          <div className="relative overflow-hidden bg-[#0f1629]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-white/20 transition-all duration-500 group">
            {/* Neon light bleed */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-teal-500/20 to-transparent opacity-80 pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-100" />
            <div className="absolute -inset-x-0 -bottom-0 h-1/2 bg-gradient-to-t from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Radar className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Total Scans
                </span>
              </div>
              <p className="text-4xl font-bold text-white tracking-tight">
                <Metric value={totalScans} />
              </p>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                All time
              </p>
            </div>
          </div>

          {/* Malicious */}
          <div className="relative overflow-hidden bg-[#0f1629]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-white/20 transition-all duration-500 group">
            {/* Neon light bleed */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-red-500/20 to-transparent opacity-80 pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-100" />
            <div className="absolute -inset-x-0 -bottom-0 h-1/2 bg-gradient-to-t from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Malicious
                </span>
              </div>
              <p className="text-4xl font-bold text-red-400 tracking-tight">
                <Metric value={maliciousScans} />
              </p>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                {loaded && totalScans > 0
                  ? `${((maliciousScans / totalScans) * 100).toFixed(1)}% detection rate`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Active Incidents */}
          <div className="relative overflow-hidden bg-[#0f1629]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-white/20 transition-all duration-500 group">
            {/* Neon light bleed */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-orange-500/20 to-transparent opacity-80 pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-100" />
            <div className="absolute -inset-x-0 -bottom-0 h-1/2 bg-gradient-to-t from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Active Incidents
                </span>
              </div>
              <p className="text-4xl font-bold text-orange-400 tracking-tight">
                <Metric value={activeIncidents} />
              </p>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                {loaded ? `${resolvedCount} resolved` : "—"}
              </p>
            </div>
          </div>

          {/* Intel Vault */}
          <div className="relative overflow-hidden bg-[#0f1629]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-white/20 transition-all duration-500 group">
            {/* Neon light bleed */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-indigo-500/20 to-transparent opacity-80 pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-100" />
            <div className="absolute -inset-x-0 -bottom-0 h-1/2 bg-gradient-to-t from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Intel Vault
                </span>
              </div>
              <p className="text-4xl font-bold text-indigo-400 tracking-tight">
                <Metric value={intelVaultSize} />
              </p>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                Proprietary indicators
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-full max-w-7xl mx-auto flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => router.push("/dashboard/scans")}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-500/20 transition-colors"
          >
            <Crosshair className="w-4 h-4" /> New Scan
          </button>
          <button
            onClick={() => router.push("/dashboard/incidents")}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> View Incidents
          </button>
          <button
            onClick={() => router.push("/dashboard/intel")}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/20 transition-colors"
          >
            <Database className="w-4 h-4" /> Threat Intel
          </button>
          {agentCriticalCount > 0 && (
            <button
              onClick={() => router.push("/dashboard/agent")}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              <Activity className="w-4 h-4" />
              Agent Events ({agentCriticalCount})
            </button>
          )}
        </div>

        {/* ── Charts + Activity Feed ────────────────────────────── */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Bar Chart */}
          <div className="relative overflow-hidden lg:col-span-2 bg-[#0f1629]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500 group">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">
                  Threats by Category
                </h3>
              </div>
              <button
                onClick={() => router.push("/dashboard/scans")}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
              >
                View All →
              </button>
            </div>
            {!loaded ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center relative z-10">
                <Activity className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400 font-medium">
                  No category data yet. Run some scans.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={categoryData}
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
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
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
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    cursor={{ fill: "rgba(13,148,136,0.06)" }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                    fill="#0d9488"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Activity Feed */}
          <div className="relative overflow-hidden bg-[#0f1629]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500 group">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">
                  Recent Activity
                </h3>
              </div>
            </div>
            {!loaded ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : recentScans.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <Radar className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400 font-medium">
                  No scans yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 flex-1">
                {recentScans.map((s, i) => (
                  <li
                    key={i}
                    className={`relative z-10 bg-white/[0.03] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.2)] border border-white/5 rounded-lg p-4 border-l-4 ${verdictColor(s.verdict)} hover:bg-white/[0.06] transition-colors cursor-pointer`}
                    onClick={() => router.push("/dashboard/threats")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-teal-400 text-sm truncate max-w-[160px]">
                        {s.target}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${verdictBadge(s.verdict)}`}
                      >
                        {s.verdict || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {s.risk_score !== undefined && (
                        <span
                          className={`text-xs font-mono font-medium ${
                            s.risk_score >= 75
                              ? "text-red-400"
                              : s.risk_score >= 40
                                ? "text-yellow-400"
                                : "text-green-400"
                          }`}
                        >
                          Risk: {s.risk_score}/100
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px] font-medium tracking-wide">
                        {s.date
                          ? new Date(s.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="w-full max-w-7xl mx-auto flex flex-wrap items-end justify-between gap-6 px-2">
          <div className="flex flex-wrap gap-6 sm:gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Posture Delta
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-lg font-medium text-slate-300">
                  {!loaded ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    postureDelta
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-l border-slate-800 pl-6 sm:pl-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Avg Risk Index
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${avgRisk >= 70 ? "bg-red-500" : avgRisk >= 40 ? "bg-orange-400" : "bg-emerald-500"}`}
                />
                <span className="text-lg font-medium text-slate-300">
                  {!loaded ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    `${avgRisk}/100`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
