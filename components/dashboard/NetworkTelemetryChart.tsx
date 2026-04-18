"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import DashboardCard from "@/components/dashboard/DashboardCard";

type TelemetryPoint = {
  slot: string;
  label: string;
  total: number;
  critical: number;
};

type TelemetryResponse = {
  points: TelemetryPoint[];
  hasData: boolean;
};

export default function NetworkTelemetryChart() {
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fetchTelemetry = useCallback(async () => {
    setErrorText(null);

    try {
      const response = await fetch("/api/metrics/network-telemetry", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as TelemetryResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load telemetry");
      }

      setPoints(payload.points ?? []);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTelemetry();

    const supabase = createClient();
    const channel = supabase
      .channel("network-telemetry-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          void fetchTelemetry();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTelemetry]);

  const hasData = useMemo(
    () => points.some((point) => point.total > 0),
    [points],
  );

  if (loading) {
    return (
      <DashboardCard className="h-64 bg-black/20 px-4 py-8 text-sm text-white/60">
        Loading telemetry...
      </DashboardCard>
    );
  }

  if (errorText) {
    return (
      <DashboardCard className="h-64 border-red-400/40 bg-red-500/10 px-4 py-8 text-sm text-red-200">
        {errorText}
      </DashboardCard>
    );
  }

  if (!hasData) {
    return (
      <DashboardCard className="flex h-64 items-center justify-center bg-black/20 px-4 py-8 text-sm text-white/60">
        No telemetry data yet
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="h-64 bg-black/20 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,14,20,0.95)",
              border: "1px solid rgba(48,54,61,0.9)",
              borderRadius: 10,
            }}
            labelStyle={{ color: "#cbd5e1" }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1" }} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#2DD4BF"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Total Alerts"
          />
          <Line
            type="monotone"
            dataKey="critical"
            stroke="#f87171"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Critical Alerts"
          />
        </LineChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
