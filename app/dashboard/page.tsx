import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import KpiCards from "./components/KpiCards";
import QuickActionsPanel from "./components/QuickActionsPanel";
import L1AgentStatusWidget from "@/components/dashboard/L1AgentStatusWidget";
import AgentChainStatusWidget from "@/components/dashboard/AgentChainStatusWidget";
import InfrastructureHealthWidget from "@/components/dashboard/InfrastructureHealthWidget";
import SOCTierBadge from "@/components/soc/SOCTierBadge";
import AgentSwarmPanel from "@/components/soc/AgentSwarmPanel";
import EscalationQueue from "@/components/soc/EscalationQueue";
import Tier0BlockFeed from "@/components/soc/Tier0BlockFeed";
import L1DecisionLog from "@/components/soc/L1DecisionLog";
import NetworkTelemetryChart from "@/components/dashboard/NetworkTelemetryChart";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

type ScanRow = {
  target: string | null;
  verdict: string | null;
  date: string | null;
  risk_score: number | null;
};

type IncidentRow = {
  status: string | null;
};

export default async function DashboardOverviewPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const supabase = await createClient();

  const [{ data: scans }, { data: incidents }, { count: intelCount }] =
    await Promise.all([
      supabase
        .from("scans")
        .select("target, verdict, date, risk_score")
        .order("date", { ascending: false })
        .limit(100),
      supabase.from("incidents").select("status"),
      supabase
        .from("proprietary_intel")
        .select("*", { count: "exact", head: true }),
    ]);

  const scanRows = (scans ?? []) as ScanRow[];
  const incidentRows = (incidents ?? []) as IncidentRow[];

  const totalScans = scanRows.length;
  const maliciousScans = scanRows.filter(
    (scan) => (scan.verdict || "").toLowerCase() === "malicious",
  ).length;
  const activeIncidents = incidentRows.filter(
    (incident) => !(incident.status || "").toLowerCase().includes("resolved"),
  ).length;
  const resolvedIncidents = incidentRows.filter((incident) =>
    (incident.status || "").toLowerCase().includes("resolved"),
  ).length;

  const recentScans = scanRows.slice(0, 5).map((scan) => ({
    target: scan.target || "Unknown target",
    verdict: (scan.verdict || "clean").toLowerCase(),
    dateLabel: scan.date ? new Date(scan.date).toLocaleString() : "Just now",
    riskScore: scan.risk_score ?? 0,
  }));

  const averageRiskScore =
    totalScans > 0
      ? Math.round(
          scanRows.reduce((sum, scan) => sum + (scan.risk_score ?? 0), 0) /
            totalScans,
        )
      : 0;
  const formattedRiskScore = `${Math.min(100, Math.max(0, averageRiskScore))}/100`;
  const timeToContain = "00:00:00";

  return (
    <div className="flex flex-col gap-6 text-white">
      <DashboardCard className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SOCTierBadge tier={1} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Total Scans</p>
            <p className="dashboard-metric-value text-white">{totalScans}</p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Malicious</p>
            <p className="dashboard-metric-value text-red-300">
              {maliciousScans}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Incidents</p>
            <p className="dashboard-metric-value text-orange-200">
              {activeIncidents}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Intel Records</p>
            <p className="dashboard-metric-value text-cyan-200">
              {intelCount ?? 0}
            </p>
          </DashboardCard>
        </div>
      </DashboardCard>

      <AgentSwarmPanel />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <EscalationQueue />
        </div>
        <div className="xl:col-span-2">
          <Tier0BlockFeed />
        </div>
      </div>

      <L1DecisionLog />

      <div className="grid grid-cols-1 gap-6">
        <KpiCards
          timeToContain={timeToContain}
          activeIncidents={activeIncidents}
          resolvedIncidents={resolvedIncidents}
          formattedRiskScore={formattedRiskScore}
        />

        <DashboardCard className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="dashboard-section-heading text-white">
              Network Telemetry (Live)
            </h2>
            <StatusBadge status="healthy" label="Live" />
          </div>

          <NetworkTelemetryChart />
        </DashboardCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActionsPanel />

          <DashboardCard className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="dashboard-section-heading text-white">
                Event Feed
              </h2>
              <StatusBadge status="healthy" label="Recent scans" />
            </div>

            <div className="flex flex-col gap-3">
              {recentScans.length === 0 ? (
                <div className="p-3 rounded-lg bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] text-sm text-white/60">
                  No recent scans yet.
                </div>
              ) : (
                recentScans.map((scan, index) => (
                  <DashboardCard
                    key={`${scan.target}-${index}`}
                    className="flex items-start gap-3 p-3"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        scan.verdict === "malicious"
                          ? "bg-red-500"
                          : scan.verdict === "suspicious"
                            ? "bg-yellow-500"
                            : "bg-[#2DD4BF]"
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-white/90 font-medium truncate">
                        {scan.target}
                      </span>
                      <span className="text-xs text-white/50">
                        {scan.dateLabel} • Risk {scan.riskScore}
                      </span>
                    </div>
                  </DashboardCard>
                ))
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <L1AgentStatusWidget />
          <AgentChainStatusWidget />
          <InfrastructureHealthWidget />
        </div>
      </div>

      <div className="hidden">{maliciousScans + (intelCount ?? 0)}</div>
    </div>
  );
}
