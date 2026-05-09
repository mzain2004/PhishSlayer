"use client";

import { useEffect, useRef, useState } from "react";

interface Alert {
  id: string;
  severity: string;
  attack_type: string;
  source_ip: string;
  status: string;
  confidence_score: number;
  created_at: string;
  affected_asset?: string;
}

interface TraceItem {
  type: string;
  tool?: string;
  duration_ms?: number;
  input?: unknown;
  output?: unknown;
  phase?: string;
  status?: string;
  message?: string;
  timestamp?: string;
}

interface Props {
  alert: Alert | null;
  onClose: () => void;
}

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

function age(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TraceAccordion({ items, streaming }: { items: TraceItem[]; streaming: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState<number | null>(null);

  if (!items.length && !streaming) return null;

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const isOpen = open === i;
        const isRaw = showRaw === i;
        const status = item.status ?? "done";
        const duration = item.duration_ms ? `${item.duration_ms}ms` : null;

        return (
          <div key={i} className="rounded-lg border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${status === "done" ? "bg-green-500" : status === "error" ? "bg-red-500" : "bg-amber-400 animate-pulse"}`}
                />
                <span className="text-xs font-mono text-zinc-300">{item.tool ?? item.phase ?? "event"}</span>
              </div>
              <div className="flex items-center gap-2">
                {duration && (
                  <span className="text-[10px] font-mono text-zinc-600 px-1.5 py-0.5 bg-zinc-800 rounded">
                    {duration}
                  </span>
                )}
                <span className="text-zinc-600">{isOpen ? "▼" : "▶"}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-2">
                {item.input !== undefined && (
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1">Input</p>
                    <p className="text-xs text-zinc-400 font-mono break-all line-clamp-2">
                      {JSON.stringify(item.input).substring(0, 120)}
                      {JSON.stringify(item.input).length > 120 ? "…" : ""}
                    </p>
                  </div>
                )}
                {item.output !== undefined && (
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1">Result</p>
                    <p className="text-xs text-zinc-400 font-mono break-all line-clamp-2">
                      {JSON.stringify(item.output).substring(0, 120)}
                      {JSON.stringify(item.output).length > 120 ? "…" : ""}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowRaw(isRaw ? null : i)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  {isRaw ? "Hide" : "Raw JSON"}
                </button>
                {isRaw && (
                  <pre className="text-[10px] text-zinc-500 font-mono bg-zinc-900 rounded p-2 overflow-x-auto">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        );
      })}
      {streaming && (
        <div className="px-3 py-2 text-xs text-zinc-500 font-mono">
          <span className="animate-pulse">▌</span> Streaming…
        </div>
      )}
    </div>
  );
}

export function AlertDetailPanel({ alert, onClose }: Props) {
  const [l1Trace, setL1Trace] = useState<TraceItem[]>([]);
  const [streaming, setStreaming] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!alert) return;
    setL1Trace([]);
    setStreaming(true);
    sourceRef.current?.close();

    const es = new EventSource(`/api/agents/l1/stream?alertId=${alert.id}`);
    sourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "tool_call" || data.type === "log_line" || data.type === "phase_complete") {
          setL1Trace((prev) => [...prev, data]);
        }
      } catch {}
    };

    es.onerror = () => {
      setStreaming(false);
      es.close();
    };

    return () => {
      sourceRef.current?.close();
    };
  }, [alert?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!alert) return null;

  const sevColor = SEV_COLORS[alert.severity] ?? "#6366f1";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto"
        style={{ animation: "slideIn 250ms cubic-bezier(0.4,0,0.2,1)" }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ backgroundColor: `${sevColor}20`, color: sevColor }}
              >
                {alert.severity}
              </span>
              <span className="text-xs font-mono text-zinc-500">{age(alert.created_at)}</span>
            </div>
            <p className="text-base font-bold text-white truncate">{alert.attack_type}</p>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">{alert.source_ip}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors text-xl"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Timeline</p>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              {["Ingested", "L1 Triage", "L2 Respond", "L3 Hunt", "Closed"].map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="text-indigo-400">{s}</span>
                  {i < 4 && <span className="text-zinc-700">→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* L1 Trace */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">L1 Trace</p>
            <TraceAccordion items={l1Trace} streaming={streaming} />
          </div>

          {/* Alert metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-1">Affected Asset</p>
              <p className="text-sm font-mono text-zinc-300">{alert.affected_asset ?? "—"}</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-1">Confidence</p>
              <p className="text-sm font-mono text-zinc-300">
                {Math.round((alert.confidence_score ?? 0) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
