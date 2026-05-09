"use client";

import { useState } from "react";

interface ConsequenceModel {
  blast_radius: "user" | "device" | "org" | "tenant";
  false_positive_probability: number;
  estimated_recovery_time_min: number;
  success_probability: number;
  side_effects: string[];
  rollback_possible: boolean;
  rollback_steps: string[];
  confidence: number;
  reasoning: string;
}

interface Action {
  id: string;
  name: string;
  target: string;
  rationale: string;
  consequence: ConsequenceModel;
}

interface Props {
  alertId: string;
  actions: Action[];
  onApprove: (actionId: string) => Promise<void>;
  onReject: (actionId: string, reason: string) => Promise<void>;
}

const BLAST_RINGS = ["user", "device", "org", "tenant"] as const;
const BLAST_COLORS: Record<string, string> = {
  user: "#6366f1",
  device: "#a855f7",
  org: "#f59e0b",
  tenant: "#ef4444",
};

const REJECT_REASONS = [
  "False positive",
  "Blast radius too wide",
  "Target incorrect",
  "Timing inappropriate",
  "Other",
];

function BlastRadiusDiagram({ blastRadius }: { blastRadius: string }) {
  const activeIndex = BLAST_RINGS.indexOf(blastRadius as typeof BLAST_RINGS[number]);
  return (
    <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
      {BLAST_RINGS.map((ring, i) => {
        const size = 32 + i * 20;
        const isActive = i <= activeIndex;
        return (
          <div
            key={ring}
            className="absolute rounded-full border-2 transition-opacity"
            style={{
              width: size,
              height: size,
              borderColor: BLAST_COLORS[ring],
              opacity: isActive ? 1 : 0.15,
              backgroundColor: isActive && i === activeIndex
                ? `${BLAST_COLORS[ring]}20`
                : "transparent",
            }}
          />
        );
      })}
      <span className="text-xs font-mono text-indigo-300 z-10">{blastRadius}</span>
    </div>
  );
}

function FalsePositiveBar({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const color =
    pct < 20 ? "#22c55e" : pct < 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>False Positive Risk</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ConsequencePanel({ alertId, actions, onApprove, onReject }: Props) {
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rollbackOpen, setRollbackOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (actionId: string, blastRadius: string) => {
    if (["org", "tenant"].includes(blastRadius)) return; // disabled in UI
    setLoading(actionId);
    try {
      await onApprove(actionId);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setLoading(actionId);
    try {
      await onReject(actionId, rejectReason);
      setRejectOpen(null);
    } finally {
      setLoading(null);
    }
  };

  if (!actions.length) return null;

  return (
    <div className="space-y-4">
      {actions.map((action) => {
        const c = action.consequence;
        const isOrgTenant = ["org", "tenant"].includes(c.blast_radius);
        const isLoading = loading === action.id;

        return (
          <div
            key={action.id}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4"
          >
            {/* Action header */}
            <div>
              <p className="text-lg font-bold text-white font-mono">{action.name}</p>
              <p className="text-sm text-zinc-400 mt-0.5">
                Target: <span className="text-indigo-300 font-mono">{action.target}</span>
              </p>
              <p className="text-sm text-zinc-500 mt-1">{action.rationale}</p>
            </div>

            {/* Blast radius diagram */}
            <BlastRadiusDiagram blastRadius={c.blast_radius} />

            {/* False positive probability */}
            <FalsePositiveBar probability={c.false_positive_probability} />

            {/* Confidence + recovery */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">Confidence</p>
                <p className="text-white font-mono mt-1">
                  {Math.round(c.confidence * 100)}%
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">Est. Recovery</p>
                <p className="text-white font-mono mt-1">{c.estimated_recovery_time_min}m</p>
              </div>
            </div>

            {/* Side effects */}
            {c.side_effects.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Side effects</p>
                <ul className="space-y-1">
                  {c.side_effects.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-amber-400 mt-0.5">⚠</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rollback steps (accordion) */}
            {c.rollback_possible && c.rollback_steps.length > 0 && (
              <div>
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() =>
                    setRollbackOpen(rollbackOpen === action.id ? null : action.id)
                  }
                >
                  {rollbackOpen === action.id ? "▼" : "▶"} Rollback steps
                </button>
                {rollbackOpen === action.id && (
                  <ol className="mt-2 space-y-1 list-decimal list-inside text-sm text-zinc-400">
                    {c.rollback_steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Approve / Reject */}
            <div className="flex gap-3 pt-1">
              <button
                disabled={isOrgTenant || isLoading}
                onClick={() => handleApprove(action.id, c.blast_radius)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                  bg-indigo-600 hover:bg-indigo-500 text-white
                  disabled:opacity-40 disabled:cursor-not-allowed"
                title={isOrgTenant ? "Requires two-person approval — contact your admin" : ""}
              >
                {isLoading ? "..." : "Approve"}
              </button>
              <button
                disabled={isLoading}
                onClick={() =>
                  setRejectOpen(rejectOpen === action.id ? null : action.id)
                }
                className="flex-1 py-2 rounded-lg text-sm font-medium
                  border border-zinc-600 text-zinc-300 hover:border-zinc-400 transition-colors
                  disabled:opacity-40"
              >
                Reject
              </button>
            </div>

            {/* Two-person warning */}
            {isOrgTenant && (
              <p className="text-xs text-amber-400 text-center">
                ⚠ Org/tenant-level actions require two-person approval
              </p>
            )}

            {/* Reject reason dropdown */}
            {rejectOpen === action.id && (
              <div className="space-y-2">
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white"
                >
                  {REJECT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  disabled={isLoading}
                  onClick={() => handleReject(action.id)}
                  className="w-full py-2 rounded-lg text-sm font-medium
                    bg-red-600 hover:bg-red-500 text-white transition-colors
                    disabled:opacity-40"
                >
                  {isLoading ? "..." : "Confirm Reject"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
