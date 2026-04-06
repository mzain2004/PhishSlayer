import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

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
    <DashboardShell>
      <div className="flex flex-col gap-6 text-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">Time to Contain</span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">{timeToContain}</div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">Active Incidents</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                {resolvedIncidents > 0 ? `-${resolvedIncidents}` : "+0"}
              </span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">{activeIncidents}</div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">API Latency</span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">14ms</div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">Global Risk Score</span>
            </div>
            <div className="text-3xl font-bold text-[#2DD4BF] mt-2">{formattedRiskScore}</div>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Network Telemetry (Live)</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-white/50 uppercase tracking-wider">Live</span>
            </div>
          </div>

          <div className="w-full h-64 relative flex items-end justify-between gap-[2px] pt-6 overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              {[...Array(5)].map((_, i) => (
                <div key={`grid-${i}`} className="w-full h-[1px] bg-white border-b border-white/5" />
              ))}
            </div>

            <div className="flex-1 flex items-end justify-between gap-[2px] h-full z-10">
              {[...Array(80)].map((_, i) => {
                const height = 20 + Math.sin(i * 0.2) * 40 + 40;
                const isPurple = i % 5 === 0;
                return (
                  <div
                    key={`bar-${i}`}
                    className={`flex-1 rounded-t-sm transition-all duration-500 ${
                      isPurple
                        ? "bg-[#A78BFA]/60 shadow-[0_0_10px_rgba(167,139,250,0.3)]"
                        : "bg-[#2DD4BF]/40 shadow-[0_0_10px_rgba(45,212,191,0.2)]"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white mb-2">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-center transition-colors">
                <span className="text-sm font-bold text-white">Run System Diagnostic</span>
              </button>
              <button className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-center transition-colors">
                <span className="text-sm font-bold text-white">Isolate Compromised Nodes</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-white">Event Feed</h2>
              <span className="text-xs text-[#2DD4BF]">Recent scans</span>
            </div>

            <div className="flex flex-col gap-3">
              {recentScans.length === 0 ? (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60">
                  No recent scans yet.
                </div>
              ) : (
                recentScans.map((scan, index) => (
                  <div
                    key={`${scan.target}-${index}`}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-start gap-3"
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="hidden">{maliciousScans + (intelCount ?? 0)}</div>
      </div>
    </DashboardShell>
  );
}
