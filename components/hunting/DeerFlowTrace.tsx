"use client";

import { useEffect, useRef, useState } from "react";

type PhaseStatus = "pending" | "running" | "complete" | "error";

interface Phase {
  id: "reader" | "hunter" | "reviewer";
  label: string;
  color: string;
}

interface LogLine {
  timestamp: string;
  agent: string;
  message: string;
}

interface IOCEntry {
  value: string;
  type: string;
  threat_score: number;
  source: string;
}

interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
}

interface Recommendation {
  priority: "P0" | "P1" | "P2";
  action: string;
  rationale: string;
}

interface HuntReport {
  executive_summary: string;
  ioc_table: IOCEntry[];
  attack_chain: { step: number; description: string; technique: string }[];
  mitre_techniques: MitreTechnique[];
  recommendations: Recommendation[];
  confidence: number;
  sources: string[];
}

interface Props {
  alertId: string;
  autoStart?: boolean;
}

const PHASES: Phase[] = [
  { id: "reader", label: "Reader", color: "#2dd4bf" },
  { id: "hunter", label: "Hunter", color: "#f87171" },
  { id: "reviewer", label: "Reviewer", color: "#f59e0b" },
];

const PRIORITY_COLORS: Record<string, string> = {
  P0: "#ef4444",
  P1: "#f59e0b",
  P2: "#6366f1",
};

function PhasePip({ phase, status }: { phase: Phase; status: PhaseStatus }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-6 h-6">
        {status === "running" && (
          <div
            className="absolute inset-0 rounded-full animate-spin border-2 border-transparent"
            style={{ borderTopColor: phase.color }}
          />
        )}
        <div
          className="w-4 h-4 rounded-full border-2 transition-all"
          style={{
            borderColor: phase.color,
            backgroundColor:
              status === "complete" || status === "running"
                ? phase.color
                : "transparent",
            opacity: status === "pending" ? 0.3 : 1,
          }}
        />
        {status === "complete" && (
          <span className="absolute text-[8px] text-zinc-900 font-bold">✓</span>
        )}
      </div>
      <span
        className="text-xs font-mono"
        style={{ color: status === "pending" ? "#52525b" : phase.color }}
      >
        {phase.label}
      </span>
    </div>
  );
}

function IOCTable({ iocs }: { iocs: IOCEntry[] }) {
  const [sort, setSort] = useState<"threat_score" | "type">("threat_score");
  const sorted = [...iocs].sort((a, b) =>
    sort === "threat_score" ? b.threat_score - a.threat_score : a.type.localeCompare(b.type)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            {["Value", "Type", "Threat Score", "Source"].map((h) => (
              <th
                key={h}
                className="text-left py-2 px-2 cursor-pointer hover:text-zinc-300"
                onClick={() => {
                  if (h === "Threat Score") setSort("threat_score");
                  if (h === "Type") setSort("type");
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((ioc, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-1.5 px-2">
                <button
                  className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
                  onClick={() => navigator.clipboard.writeText(ioc.value)}
                  title="Click to copy"
                >
                  {ioc.value}
                </button>
              </td>
              <td className="py-1.5 px-2 text-zinc-400">{ioc.type}</td>
              <td className="py-1.5 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(ioc.threat_score * 100)}%`,
                        backgroundColor:
                          ioc.threat_score > 0.7
                            ? "#ef4444"
                            : ioc.threat_score > 0.4
                            ? "#f59e0b"
                            : "#22c55e",
                      }}
                    />
                  </div>
                  <span className="text-zinc-300">{Math.round(ioc.threat_score * 100)}%</span>
                </div>
              </td>
              <td className="py-1.5 px-2 text-zinc-500">{ioc.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeerFlowTrace({ alertId, autoStart = false }: Props) {
  const [phaseStatus, setPhaseStatus] = useState<Record<string, PhaseStatus>>({
    reader: "pending",
    hunter: "pending",
    reviewer: "pending",
  });
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [report, setReport] = useState<HuntReport | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (autoStart) startStream();
    return () => sourceRef.current?.close();
  }, [alertId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const startStream = () => {
    if (streaming || sourceRef.current) return;
    setStreaming(true);
    setError(null);

    const es = new EventSource(`/api/agents/l3/stream?alertId=${alertId}`);
    sourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleEvent(data);
      } catch {}
    };

    es.onerror = () => {
      setError("Stream disconnected. Retry in 3s...");
      es.close();
      sourceRef.current = null;
      setTimeout(() => {
        setStreaming(false);
        setError(null);
      }, 3000);
    };
  };

  const handleEvent = (data: Record<string, unknown>) => {
    const type = data.type as string;
    if (type === "phase_complete") {
      const phase = data.phase as string;
      setPhaseStatus((prev) => ({ ...prev, [phase]: "complete" }));
      if (data.status === "running") {
        setPhaseStatus((prev) => ({ ...prev, [phase]: "running" }));
      }
      if ((data.subtype as string) === "report_ready") {
        fetchReport();
      }
    } else if (type === "log_line") {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString().substring(11, 19),
          agent: (data.agent as string) || "Agent",
          message: (data.message as string) || "",
        },
      ]);
    } else if (type === "report_ready") {
      fetchReport();
    } else if (type === "error") {
      setError((data.message as string) || "Stream error");
      setStreaming(false);
    }
  };

  const fetchReport = async () => {
    try {
      const resp = await fetch(`/api/agents/l3/report?alertId=${alertId}`);
      if (resp.ok) setReport(await resp.json());
    } catch {}
  };

  const agentChipColor: Record<string, string> = {
    Reader: "#2dd4bf",
    Hunter: "#f87171",
    Reviewer: "#f59e0b",
  };

  return (
    <div className="space-y-4">
      {/* Phase progress */}
      <div className="flex items-center gap-4 py-3 px-4 bg-zinc-900 rounded-xl border border-zinc-800">
        {PHASES.map((phase, i) => (
          <div key={phase.id} className="flex items-center gap-3">
            <PhasePip phase={phase} status={phaseStatus[phase.id] as PhaseStatus} />
            {i < PHASES.length - 1 && (
              <span className="text-zinc-700 text-sm">→</span>
            )}
          </div>
        ))}
        {!streaming && !report && (
          <button
            onClick={startStream}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Start Hunt
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 px-2">{error}</p>
      )}

      {/* Live log */}
      {logs.length > 0 && (
        <div
          ref={logRef}
          className="bg-zinc-950 rounded-xl border border-zinc-800 p-3 h-48 overflow-y-auto"
        >
          {logs.map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono mb-1">
              <span className="text-zinc-600 shrink-0">{line.timestamp}</span>
              <span
                className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  backgroundColor: `${agentChipColor[line.agent] ?? "#6366f1"}20`,
                  color: agentChipColor[line.agent] ?? "#6366f1",
                }}
              >
                {line.agent}
              </span>
              <span className="text-zinc-400 break-all">{line.message}</span>
            </div>
          ))}
          {streaming && (
            <span className="text-indigo-400 animate-pulse text-xs font-mono">▌</span>
          )}
        </div>
      )}

      {/* Hunt report */}
      {report && (
        <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Hunt Report</p>
            <span className="text-xs font-mono text-indigo-300">
              Confidence: {Math.round(report.confidence * 100)}%
            </span>
          </div>

          {/* Executive summary */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-1">Executive Summary</p>
            <p className="text-sm text-zinc-200">{report.executive_summary}</p>
          </div>

          {/* IOC table */}
          {report.ioc_table.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">IOC Table ({report.ioc_table.length})</p>
              <IOCTable iocs={report.ioc_table} />
            </div>
          )}

          {/* MITRE techniques */}
          {report.mitre_techniques.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">MITRE ATT&CK</p>
              <div className="flex flex-wrap gap-2">
                {report.mitre_techniques.map((t) => (
                  <a
                    key={t.id}
                    href={`https://attack.mitre.org/techniques/${t.id.replace(".", "/")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <span className="text-xs font-mono text-indigo-400">{t.id}</span>
                    <span className="text-xs text-zinc-400">{t.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Recommendations</p>
              <ol className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: `${PRIORITY_COLORS[rec.priority] ?? "#6366f1"}20`,
                        color: PRIORITY_COLORS[rec.priority] ?? "#6366f1",
                      }}
                    >
                      {rec.priority}
                    </span>
                    <div>
                      <p className="text-sm text-white">{rec.action}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{rec.rationale}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-600 text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              Export PDF
            </button>
            <button
              onClick={async () => {
                await fetch(`/api/agents/l3/index`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ alertId }),
                });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Index to Threat Intel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
