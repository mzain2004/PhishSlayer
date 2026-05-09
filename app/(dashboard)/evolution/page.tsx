"use client";

import { useEffect, useState } from "react";

type Source = "openspace" | "halo" | "evomap";
type ProposalStatus = "pending" | "approved" | "rejected";

interface Proposal {
  id: string;
  source: Source;
  proposal_type: string;
  proposal_data: Record<string, unknown>;
  applied: boolean;
  applied_at?: string;
  applied_by?: string;
  created_at: string;
}

const SOURCE_COLORS: Record<Source, string> = {
  openspace: "#a855f7",
  halo: "#f59e0b",
  evomap: "#2dd4bf",
};

const SOURCE_LABELS: Record<Source, string> = {
  openspace: "OpenSpace",
  halo: "HALO",
  evomap: "EvoMap",
};

const TABS = ["Timeline", "Capabilities", "HALO Optimizer"] as const;
type Tab = typeof TABS[number];

function SourceChip({ source }: { source: Source }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{
        backgroundColor: `${SOURCE_COLORS[source]}20`,
        color: SOURCE_COLORS[source],
      }}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

function ProposalCard({
  proposal,
  onAction,
}: {
  proposal: Proposal;
  onAction: (id: string, action: "approve" | "reject") => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isPending = !proposal.applied && !proposal.applied_at;
  const isApplied = proposal.applied;

  const handle = async (action: "approve" | "reject") => {
    setLoading(true);
    try {
      await onAction(proposal.id, action);
    } finally {
      setLoading(false);
    }
  };

  const data = proposal.proposal_data;

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-all ${
        isPending
          ? "border-amber-500/40 bg-zinc-900 animate-pulse-border"
          : isApplied
          ? "border-green-500/30 bg-zinc-900/60"
          : "border-zinc-700 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SourceChip source={proposal.source as Source} />
          <span className="text-xs font-mono text-zinc-400">{proposal.proposal_type}</span>
        </div>
        <div className="flex items-center gap-2">
          {isPending && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/50 text-amber-400 animate-pulse">
              PROPOSED
            </span>
          )}
          {isApplied && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
              APPLIED
            </span>
          )}
          {!isPending && !isApplied && proposal.applied_at && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-400">
              REJECTED
            </span>
          )}
        </div>
      </div>

      {Boolean(data.rationale) && (
        <p className="text-sm text-zinc-300">{String(data.rationale)}</p>
      )}

      {Boolean(data.suggested_change) && (
        <div className="bg-zinc-800 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">Suggested change</p>
          <p className="text-xs font-mono text-zinc-300">{String(data.suggested_change)}</p>
        </div>
      )}

      {isApplied && proposal.applied_at && (
        <p className="text-xs text-zinc-500">
          Applied {new Date(proposal.applied_at).toLocaleDateString()}
          {proposal.applied_by ? ` by ${proposal.applied_by.substring(0, 8)}…` : ""}
        </p>
      )}

      {isPending && (
        <div className="flex gap-2 pt-1">
          <button
            disabled={loading}
            onClick={() => handle("approve")}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-40"
          >
            {loading ? "…" : "Approve"}
          </button>
          <button
            disabled={loading}
            onClick={() => handle("reject")}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-zinc-600 text-zinc-300 hover:border-zinc-400 transition-colors disabled:opacity-40"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function TimelineTab({
  proposals,
  onAction,
}: {
  proposals: Proposal[];
  onAction: (id: string, action: "approve" | "reject") => Promise<void>;
}) {
  if (!proposals.length) {
    return (
      <p className="text-sm text-zinc-500 text-center py-12">
        No evolution proposals yet. Run more incidents to generate proposals.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <div key={p.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: SOURCE_COLORS[p.source as Source] ?? "#6366f1" }}
            />
            <div className="w-px flex-1 bg-zinc-800 mt-1" />
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <p className="text-xs text-zinc-500 mb-1.5">
              {new Date(p.created_at).toLocaleString()}
            </p>
            <ProposalCard proposal={p} onAction={onAction} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilitiesTab() {
  return (
    <div className="flex items-center justify-center h-64 rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="text-center space-y-2">
        <p className="text-zinc-400 text-sm">Capability DAG</p>
        <p className="text-zinc-600 text-xs">EvoMap D3 graph — requires EvoMap SDK</p>
      </div>
    </div>
  );
}

function HALOTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-400 mb-3">Confidence Threshold Optimization</p>
        <div className="flex items-center justify-center h-40 rounded-lg bg-zinc-800">
          <p className="text-zinc-600 text-xs">HALO trend chart — requires HALO SDK + agentops data</p>
        </div>
      </div>
    </div>
  );
}

export default function EvolutionPage() {
  const [tab, setTab] = useState<Tab>("Timeline");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/evolution");
      if (resp.ok) {
        const data = await resp.json();
        setProposals(data.proposals ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    await fetch("/api/evolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: id, action }),
    });
    await fetchProposals();
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Self-Evolution</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Agent capability proposals from OpenSpace, HALO, and EvoMap. All changes require manual approval.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {tab === "Timeline" && (
            <TimelineTab proposals={proposals} onAction={handleAction} />
          )}
          {tab === "Capabilities" && <CapabilitiesTab />}
          {tab === "HALO Optimizer" && <HALOTab />}
        </>
      )}
    </div>
  );
}
