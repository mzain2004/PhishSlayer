"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface SocMetrics {
  mttr_avg_min: number;
  mttr_delta: number;
  alerts_today: number;
  alerts_today_delta: number;
  auto_close_pct: number;
  auto_close_pct_delta: number;
  fp_rate: number;
  fp_rate_delta: number;
  mttr_trend: { date: string; mttr: number }[];
  volume_trend: { date: string; critical: number; high: number; medium: number; low: number }[];
  agent_perf: { agent: string; avg_latency_ms: number; tokens_per_alert: number; success_rate: number; status: string }[];
}

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  unit?: string;
}

function StatCard({ label, value, delta, unit }: StatCardProps) {
  const deltaPositive = delta !== undefined && delta > 0;
  const deltaNegative = delta !== undefined && delta < 0;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <p className="text-[32px] font-bold text-white leading-none" style={{ fontFamily: "var(--font-sohne, sans-serif)" }}>
          {value}
          {unit && <span className="text-lg text-zinc-400 ml-1">{unit}</span>}
        </p>
        {delta !== undefined && (
          <span
            className={`text-sm font-mono mb-1 ${
              deltaPositive ? "text-green-400" : deltaNegative ? "text-red-400" : "text-zinc-500"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

const CHART_STYLE = {
  backgroundColor: "transparent",
  stroke: "#27272a",
};

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<SocMetrics | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [range]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/metrics?range=${range}`);
      if (resp.ok) setMetrics(await resp.json());
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white">SOC Metrics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">SOC Metrics</h1>
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                range === r ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MTTR"
          value={metrics.mttr_avg_min.toFixed(0)}
          unit="min"
          delta={metrics.mttr_delta}
        />
        <StatCard
          label="Alerts Today"
          value={String(metrics.alerts_today)}
          delta={metrics.alerts_today_delta}
        />
        <StatCard
          label="Auto-Close %"
          value={metrics.auto_close_pct.toFixed(1)}
          unit="%"
          delta={metrics.auto_close_pct_delta}
        />
        <StatCard
          label="False Positive Rate"
          value={metrics.fp_rate.toFixed(1)}
          unit="%"
          delta={metrics.fp_rate_delta}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MTTR Trend */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-semibold text-zinc-300 mb-4">MTTR Trend (min)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.mttr_trend}>
              <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "SLA 60m", fill: "#f59e0b", fontSize: 10 }} />
              <Line type="monotone" dataKey="mttr" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Volume */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-semibold text-zinc-300 mb-4">Alert Volume</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.volume_trend}>
              <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "#71717a" }} />
              <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" stackId="a" fill="#f97316" />
              <Bar dataKey="medium" stackId="a" fill="#f59e0b" />
              <Bar dataKey="low" stackId="a" fill="#22c55e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <p className="text-sm font-semibold text-zinc-300 px-5 py-4 bg-zinc-900 border-b border-zinc-800">
          Agent Performance
        </p>
        <table className="w-full">
          <thead className="bg-zinc-900/50">
            <tr>
              {["Agent", "Avg Latency", "Tokens/Alert", "Success Rate", "Status"].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.agent_perf.map((row) => (
              <tr key={row.agent} className="border-t border-zinc-800 hover:bg-zinc-800/20">
                <td className="py-3 px-4 text-sm font-mono text-indigo-400">{row.agent}</td>
                <td className="py-3 px-4 text-sm font-mono text-zinc-300">{row.avg_latency_ms}ms</td>
                <td className="py-3 px-4 text-sm font-mono text-zinc-300">{row.tokens_per_alert.toLocaleString()}</td>
                <td className="py-3 px-4 text-sm font-mono text-zinc-300">
                  {Math.round(row.success_rate * 100)}%
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.status === "healthy"
                        ? "bg-green-500/20 text-green-400"
                        : row.status === "degraded"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {row.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
