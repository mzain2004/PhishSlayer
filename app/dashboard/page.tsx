"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldAlert,
  AlertTriangle,
  Database,
  Activity,
  Plus,
  Shield,
  Search,
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
  const [totalScans, setTotalScans] = useState(0);
  const [maliciousScans, setMaliciousScans] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);
  const [intelVaultSize, setIntelVaultSize] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    Promise.all([getIncidents(), getScans(), getIntelIndicators()])
      .then(([incidents, scans, intel]) => {
        const scanArr = scans as ScanRecord[];
        setTotalScans(scanArr.length);
        setMaliciousScans(scanArr.filter((s) => s.verdict?.toLowerCase() === "malicious").length);
        const open = incidents.filter((i: any) => !i.status?.toLowerCase().includes("resolved"));
        setActiveIncidents(open.length);
        setResolvedCount(incidents.filter((i: any) => i.status?.toLowerCase().includes("resolved")).length);
        setIntelVaultSize(intel.length);

        const sorted = [...scanArr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentScans(sorted.slice(0, 5));

        const cats: Record<string, number> = {};
        scanArr.filter((s) => s.threat_category && s.threat_category !== "Unknown").forEach((s) => {
          const c = s.threat_category!;
          cats[c] = (cats[c] || 0) + 1;
        });
        setCategoryData(Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const Metric = ({ value }: { value: string | number }) =>
    !loaded ? <Loader2 className="w-6 h-6 animate-spin text-[#6e7681] mx-auto" /> : <>{value}</>;

  return (
    <div className="flex-1 flex flex-col bg-transparent min-h-full w-full">
      {/* Page Header */}
      <div className="px-8 py-6 border-b border-[#30363d]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#e6edf3] text-2xl font-semibold tracking-tight">
              Command Center
            </h1>
            <p className="text-[#8b949e] text-sm mt-0.5">
              Enterprise Security Posture — God&apos;s Eye View
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[#6e7681] text-[10px] font-semibold uppercase tracking-widest">
                Network Integrity
              </span>
              <span
                className={`text-sm font-semibold ${
                  !loaded ? "text-[#6e7681]" : activeIncidents === 0 ? "text-[#3fb950]" : activeIncidents <= 5 ? "text-[#e3b341]" : "text-[#f85149]"
                }`}
              >
                {!loaded ? <Loader2 className="w-3 h-3 animate-spin inline" /> : activeIncidents === 0 ? "Resilient" : activeIncidents <= 5 ? "Stable" : "At Risk"}
              </span>
            </div>
            <button
              onClick={() => router.push("/dashboard/incidents")}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-teal-500/10"
            >
              Intervene
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-teal-500/50 shadow-[0_0_15px_rgba(45,212,191,0.05)] hover:shadow-[0_0_30px_rgba(45,212,191,0.15)] transition-all duration-500 group">
            <div className="h-px w-full bg-gradient-to-r from-teal-500/80 via-teal-500/30 to-transparent mb-4 -mt-5 -mx-5 px-0 rounded-t-xl animate-pulse duration-1000" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#6e7681] font-semibold">Total Scans</span>
                <p className="text-3xl font-bold tracking-tight text-[#e6edf3]"><Metric value={totalScans} /></p>
                <p className="text-[#8b949e] text-xs">All time scans</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                <Activity className="w-4 h-4 text-teal-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-red-500/50 shadow-[0_0_15px_rgba(248,81,73,0.05)] hover:shadow-[0_0_30px_rgba(248,81,73,0.15)] transition-all duration-500 group">
            <div className="h-px w-full bg-gradient-to-r from-red-500/80 via-red-500/30 to-transparent mb-4 -mt-5 -mx-5 px-0 rounded-t-xl animate-pulse duration-1000" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#6e7681] font-semibold">Malicious</span>
                <p className="text-3xl font-bold tracking-tight text-[#f85149]"><Metric value={maliciousScans} /></p>
                <p className="text-[#8b949e] text-xs">Threats detected</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-amber-500/50 shadow-[0_0_15px_rgba(227,179,65,0.05)] hover:shadow-[0_0_30px_rgba(227,179,65,0.15)] transition-all duration-500 group">
            <div className="h-px w-full bg-gradient-to-r from-amber-500/80 via-amber-500/30 to-transparent mb-4 -mt-5 -mx-5 px-0 rounded-t-xl animate-pulse duration-1000" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#6e7681] font-semibold">Active Incidents</span>
                <p className="text-3xl font-bold tracking-tight text-[#e3b341]"><Metric value={activeIncidents} /></p>
                <p className="text-[#8b949e] text-xs">{resolvedCount} resolved</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-violet-500/50 shadow-[0_0_15px_rgba(167,139,250,0.05)] hover:shadow-[0_0_30px_rgba(167,139,250,0.15)] transition-all duration-500 group">
            <div className="h-px w-full bg-gradient-to-r from-violet-500/80 via-violet-500/30 to-transparent mb-4 -mt-5 -mx-5 px-0 rounded-t-xl animate-pulse duration-1000" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#6e7681] font-semibold">Intel Vault</span>
                <p className="text-3xl font-bold tracking-tight text-[#a78bfa]"><Metric value={intelVaultSize} /></p>
                <p className="text-[#8b949e] text-xs">Indicators stored</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Database className="w-4 h-4 text-violet-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/scans")} className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Scan
          </button>
          <button onClick={() => router.push("/dashboard/incidents")} className="flex items-center gap-2 px-4 py-2 bg-[#1c2128] hover:bg-[#21262d] border border-[#30363d] text-[#e6edf3] text-sm font-medium rounded-lg transition-colors">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> View Incidents
          </button>
          <button onClick={() => router.push("/dashboard/intel")} className="flex items-center gap-2 px-4 py-2 bg-[#1c2128] hover:bg-[#21262d] border border-[#30363d] text-[#e6edf3] text-sm font-medium rounded-lg transition-colors">
            <Database className="w-4 h-4 text-violet-400" /> Threat Intel
          </button>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h3 className="text-[#e6edf3] text-sm font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400" /> Threats by Category
            </h3>
            {!loaded ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
            ) : categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-[#6e7681] text-sm">No categorical threat data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: "8px", color: "#e6edf3", fontSize: "12px" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#e6edf3] text-sm font-semibold mb-6">Recent Activity</h3>
            {!loaded ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
            ) : recentScans.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6e7681] text-sm text-center">
                <Shield className="w-8 h-8 mb-2 opacity-20" /> No scan history found.
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {recentScans.map((s, i) => (
                  <div key={i} className="bg-[#1c2128] border border-[#21262d] rounded-lg px-4 py-3 hover:border-[#30363d] transition-all cursor-pointer" onClick={() => router.push("/dashboard/threats")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] text-[#2dd4bf] truncate max-w-[140px]">{s.target}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase ${s.verdict?.toLowerCase() === 'malicious' ? 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/20' : 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20'}`}>
                        {s.verdict || 'CLEAN'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                      <span>{s.date ? new Date(s.date).toLocaleDateString() : 'Just now'}</span>
                      <span className="text-[#e6edf3] font-bold">Score Index: {100 - (s.risk_score || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
