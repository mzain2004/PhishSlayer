"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  FileText,
  Loader2,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

type TimelineEvent = {
  id: string;
  timestamp: string;
  source: string;
  sourceType: string;
  eventType: string;
  actor: string;
  target?: string;
  action?: string;
  outcome?: string;
  severity: string;
};

type AttackPhase = {
  phase: string;
  killChainStage: string;
  startTime: string;
  endTime: string;
  events: TimelineEvent[];
  summary: string;
};

type AttackTimeline = {
  caseId: string;
  orgId: string;
  startTime: string;
  endTime: string;
  totalEvents: number;
  phases: AttackPhase[];
  timeline: TimelineEvent[];
  attackPath: AttackPhase[];
  involvedIps: string[];
  involvedUsers: string[];
};

type EvidenceItem = {
  id: string;
  evidence_type?: string;
  type?: string;
  title: string;
  description?: string | null;
  tags?: string[];
  addedAt?: string;
  created_at?: string;
};

type ForensicReport = {
  caseId: string;
  generatedAt: string;
  executiveSummary: string;
  technicalAnalysis: string;
  attackMethodology: string;
  impactAssessment: string;
  recommendations: string[];
  evidenceCount: number;
  iocSummary: string[];
};

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id as string | undefined);
  const { userId } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const orgId = organization?.id || null;

  const [timeline, setTimeline] = useState<AttackTimeline | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!orgLoaded) return;
    if (!userId || !orgId || !caseId) {
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);
    setErrorText(null);

    Promise.all([
      fetch(`/api/cases/${caseId}/timeline`, { cache: "no-store" }),
      fetch(`/api/cases/${caseId}/evidence`, { cache: "no-store" }),
      fetch(`/api/cases/${caseId}/report`, { cache: "no-store" }),
    ])
      .then(async ([timelineRes, evidenceRes, reportRes]) => {
        if (!timelineRes.ok) {
          const data = await timelineRes.json();
          throw new Error(data.error || "Failed to load timeline");
        }
        if (!evidenceRes.ok) {
          const data = await evidenceRes.json();
          throw new Error(data.error || "Failed to load evidence");
        }
        if (!reportRes.ok) {
          const data = await reportRes.json();
          throw new Error(data.error || "Failed to load report");
        }

        const [timelineData, evidenceData, reportData] = await Promise.all([
          timelineRes.json(),
          evidenceRes.json(),
          reportRes.json(),
        ]);

        if (!isActive) return;
        setTimeline(timelineData as AttackTimeline);
        setEvidence((evidenceData as EvidenceItem[]) || []);
        setReport(reportData as ForensicReport);
      })
      .catch((error) => {
        if (!isActive) return;
        setErrorText(
          error instanceof Error ? error.message : "Unable to load case data",
        );
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [caseId, orgId, orgLoaded, userId]);

  const timelineSummary = useMemo(() => {
    if (!timeline) return { phases: 0, events: 0, iocs: 0 };
    return {
      phases: timeline.phases?.length || 0,
      events: timeline.totalEvents || 0,
      iocs:
        (timeline.involvedIps?.length || 0) +
        (timeline.involvedUsers?.length || 0),
    };
  }, [timeline]);

  return (
    <div className="flex flex-col gap-6 text-white">
      <DashboardCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Case dossier
            </p>
            <h2 className="text-lg font-semibold text-white">
              Case {caseId || ""}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Organization: {organization?.name || "Not selected"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Phases</p>
            <p className="dashboard-metric-value text-violet-300">
              {timelineSummary.phases}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Events</p>
            <p className="dashboard-metric-value text-sky-300">
              {timelineSummary.events}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Evidence</p>
            <p className="dashboard-metric-value text-emerald-300">
              {report?.evidenceCount ?? evidence.length}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">IOCs</p>
            <p className="dashboard-metric-value text-red-300">
              {timelineSummary.iocs}
            </p>
          </DashboardCard>
        </div>
      </DashboardCard>

      {!orgLoaded ? (
        <DashboardCard className="text-white/70">
          Loading organization...
        </DashboardCard>
      ) : !orgId ? (
        <DashboardCard className="text-white/70">
          Select an organization to view this case.
        </DashboardCard>
      ) : loading ? (
        <DashboardCard className="text-white/70 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading case timeline and evidence...
        </DashboardCard>
      ) : errorText ? (
        <DashboardCard className="border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {errorText}
          </div>
        </DashboardCard>
      ) : (
        <>
          <DashboardCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-[#7c6af7]" />
              <h3 className="text-base font-semibold text-white">
                Attack Timeline
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(timeline?.phases || []).map((phase) => (
                <div
                  key={`${phase.phase}-${phase.startTime}`}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {phase.killChainStage}
                    </p>
                    <StatusBadge
                      status="warning"
                      label={phase.events.length + " events"}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{phase.summary}</p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    {formatDateTime(phase.startTime)} -{" "}
                    {formatDateTime(phase.endTime)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-semibold text-white">Recent Events</p>
              <div className="mt-3 space-y-2">
                {(timeline?.timeline || []).slice(-5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-2 text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{event.eventType}</span>
                      <span className="text-slate-500">{event.actor}</span>
                    </div>
                    <span className="text-slate-500">
                      {formatDateTime(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-300" />
              <h3 className="text-base font-semibold text-white">
                Evidence Locker
              </h3>
            </div>

            {evidence.length === 0 ? (
              <p className="text-sm text-slate-400">
                No evidence collected for this case yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <StatusBadge
                        status="healthy"
                        label={(
                          item.evidence_type ||
                          item.type ||
                          "evidence"
                        ).replace(/_/g, " ")}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {item.description || "No description provided."}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-500">
                      Added: {formatDateTime(item.addedAt || item.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-300" />
              <h3 className="text-base font-semibold text-white">
                Forensic Report
              </h3>
            </div>

            {!report ? (
              <p className="text-sm text-slate-400">
                Forensic report is not available yet.
              </p>
            ) : (
              <div className="space-y-4 text-sm text-slate-200">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Executive Summary
                  </p>
                  <p className="mt-2 text-slate-200">
                    {report.executiveSummary}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Technical Analysis
                  </p>
                  <p className="mt-2 text-slate-200">
                    {report.technicalAnalysis}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Recommendations
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-200">
                    {(report.recommendations || []).map((rec, index) => (
                      <li key={`${rec}-${index}`}>• {rec}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-slate-400">
                  Generated: {formatDateTime(report.generatedAt)}
                </div>
              </div>
            )}
          </DashboardCard>
        </>
      )}
    </div>
  );
}
