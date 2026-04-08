"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AgentStatus = "online" | "idle" | "error";

type AgentRecord = {
  id: string;
  name: string;
  status: AgentStatus;
  last_run: string | null;
};

type LastRunSummary = {
  ranAt?: string;
};

type AgentListResponse = {
  agents?: Array<{
    id?: string;
    agentId?: string;
    name?: string;
    status?: string;
    state?: string;
    lastSeen?: string;
    last_run?: string;
  }>;
};

function normalizeStatus(raw: string | undefined): AgentStatus {
  const value = (raw || "").toLowerCase();
  if (value.includes("online") || value.includes("active")) {
    return "online";
  }
  if (
    value.includes("error") ||
    value.includes("fail") ||
    value.includes("down")
  ) {
    return "error";
  }
  return "idle";
}

function statusColor(status: AgentStatus): string {
  if (status === "online") {
    return "bg-emerald-400";
  }
  if (status === "error") {
    return "bg-red-400";
  }
  return "bg-slate-400";
}

export default function AgentSwarmPanel() {
  const [l1Agent, setL1Agent] = useState<AgentRecord | null>(null);
  const [l2Agent, setL2Agent] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggeringL1, setTriggeringL1] = useState(false);
  const [triggeringL2, setTriggeringL2] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [l1DecisionCount, setL1DecisionCount] = useState(0);
  const [l2DecisionCount, setL2DecisionCount] = useState(0);
  const [l2LastRunOverride, setL2LastRunOverride] = useState<string | null>(
    null,
  );

  const hitlEnabled =
    String(process.env.NEXT_PUBLIC_HITL_MODE || "true").toLowerCase() !==
    "false";

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("l2_agent_last_run");
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as LastRunSummary;
      if (parsed.ranAt) {
        setL2LastRunOverride(parsed.ranAt);
      }
    } catch {
      window.localStorage.removeItem("l2_agent_last_run");
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    try {
      const [agentsRes, l1CountPromise, l2CountPromise] = await Promise.all([
        fetch("/api/agent/list", { method: "GET", credentials: "include" }),
        createClient()
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .in("action", ["L1_AUTO_CLOSED", "ALERT_ESCALATED"]),
        createClient()
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .eq("action", "L2_DECISION"),
      ]);

      const payload = (await agentsRes.json()) as AgentListResponse;
      if (!agentsRes.ok) {
        throw new Error("Failed to load agent list");
      }

      const mapped = (payload.agents || []).map((agent) => ({
        id: agent.id || agent.agentId || "l1-triage-agent",
        name: agent.name || "L1 Triage Agent",
        status: normalizeStatus(agent.status || agent.state),
        last_run: agent.last_run || agent.lastSeen || null,
      }));

      const firstAgent = mapped[0] || {
        id: "l1-triage-agent",
        name: "L1 Triage Agent",
        status: "idle" as AgentStatus,
        last_run: null,
      };

      const inferredL2Status = mapped[1]?.status || firstAgent.status || "idle";
      const inferredL2Run = l2LastRunOverride || mapped[1]?.last_run || null;

      setL1Agent({
        id: firstAgent.id,
        name: "L1 Triage Agent",
        status: firstAgent.status,
        last_run: firstAgent.last_run,
      });

      setL2Agent({
        id: mapped[1]?.id || "l2-responder-agent",
        name: "L2 Responder Agent",
        status: inferredL2Status,
        last_run: inferredL2Run,
      });

      setL1DecisionCount(l1CountPromise.count || 0);
      setL2DecisionCount(l2CountPromise.count || 0);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [l2LastRunOverride]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const totalAgents = useMemo(() => 2, []);

  const triggerL1Now = async () => {
    setTriggeringL1(true);
    setErrorText(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be authenticated to trigger this agent.");
      }

      const response = await fetch("/api/agent/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "Failed to trigger L1 triage.");
      }

      await fetchAgents();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setTriggeringL1(false);
    }
  };

  const triggerL2Now = async () => {
    setTriggeringL2(true);
    setErrorText(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be authenticated to trigger this agent.");
      }

      const response = await fetch("/api/agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to trigger L2 response.");
      }

      const ranAt = new Date().toISOString();
      window.localStorage.setItem(
        "l2_agent_last_run",
        JSON.stringify({ ranAt, summary: payload }),
      );
      setL2LastRunOverride(ranAt);

      await fetchAgents();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setTriggeringL2(false);
    }
  };

  return (
    <div className="p-6 bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Agent Command Center</h2>
        <div className="text-xs text-white/60 uppercase tracking-[0.14em]">
          Agents: {totalAgents} | L1 Decisions: {l1DecisionCount} | L2
          Decisions: {l2DecisionCount}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading swarm status...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[l1Agent, l2Agent].filter(Boolean).map((agent, index) => (
            <div
              key={agent!.id}
              className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/20 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-white font-semibold">{agent!.name}</p>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${statusColor(agent!.status)}`}
                />
              </div>

              {index === 1 ? (
                <div
                  className={`text-[10px] uppercase tracking-[0.14em] font-semibold rounded-full px-2 py-1 border w-fit ${
                    hitlEnabled
                      ? "text-emerald-200 border-emerald-400/40 bg-emerald-500/20"
                      : "text-red-200 border-red-400/40 bg-red-500/20"
                  }`}
                >
                  HITL: {hitlEnabled ? "ON" : "OFF"}
                </div>
              ) : null}

              <p className="text-xs text-white/60">
                Last run:{" "}
                {agent!.last_run
                  ? new Date(agent!.last_run).toLocaleString()
                  : "Never"}
              </p>

              <p className="text-xs text-white/60">
                Total decisions made:{" "}
                {index === 0 ? l1DecisionCount : l2DecisionCount}
              </p>

              <button
                type="button"
                onClick={index === 0 ? triggerL1Now : triggerL2Now}
                disabled={index === 0 ? triggeringL1 : triggeringL2}
                className="rounded-full px-4 py-2 text-sm font-semibold text-black bg-gradient-to-r from-[#2DD4BF] to-[#22c55e] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {(index === 0 ? triggeringL1 : triggeringL2) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Triggering...
                  </>
                ) : (
                  "Trigger Now"
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
    </div>
  );
}
