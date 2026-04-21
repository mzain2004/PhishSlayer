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

type L2DecisionItem = {
  id: string;
  escalationId: string | null;
  decision: string;
  confidence: number | null;
  actionTaken: string;
  createdAt: string;
  alertSource: string;
};

type L3TelemetrySnapshot = {
  iocsIngested: number;
  findings24h: number;
  confidenceScores: number[];
  lastRun: string | null;
  reasoningSummary: string;
};

function extractAlertSource(
  iocsConsidered: unknown,
  telemetrySnapshot: unknown,
  alertId: string | null,
): string {
  if (Array.isArray(iocsConsidered) && iocsConsidered.length > 0) {
    const first = iocsConsidered[0];
    if (first && typeof first === "object") {
      const source = (first as { source?: unknown }).source;
      if (typeof source === "string" && source.trim().length > 0) {
        return source;
      }
    }
  }

  if (telemetrySnapshot && typeof telemetrySnapshot === "object") {
    const source = (telemetrySnapshot as { source?: unknown }).source;
    if (typeof source === "string" && source.trim().length > 0) {
      return source;
    }

    const nested = (
      telemetrySnapshot as { original_telemetry_snapshot?: unknown }
    ).original_telemetry_snapshot;
    if (nested && typeof nested === "object") {
      const nestedSource = (nested as { source?: unknown }).source;
      if (typeof nestedSource === "string" && nestedSource.trim().length > 0) {
        return nestedSource;
      }
    }
  }

  return alertId ? "wazuh" : "unknown";
}

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
    return "bg-accent";
  }
  if (status === "error") {
    return "bg-danger";
  }
  return "bg-white/40";
}

export default function AgentSwarmPanel() {
  const [l1Agent, setL1Agent] = useState<AgentRecord | null>(null);
  const [l2Agent, setL2Agent] = useState<AgentRecord | null>(null);
  const [l3Agent, setL3Agent] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggeringL1, setTriggeringL1] = useState(false);
  const [triggeringL2, setTriggeringL2] = useState(false);
  const [triggeringL3, setTriggeringL3] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [l1DecisionCount, setL1DecisionCount] = useState(0);
  const [l2DecisionCount, setL2DecisionCount] = useState(0);
  const [l3FindingCount, setL3FindingCount] = useState(0);
  const [l3EscalatedCount, setL3EscalatedCount] = useState(0);
  const [l2RecentDecisions, setL2RecentDecisions] = useState<L2DecisionItem[]>(
    [],
  );
  const [l3Telemetry, setL3Telemetry] = useState<L3TelemetrySnapshot>({
    iocsIngested: 0,
    findings24h: 0,
    confidenceScores: [],
    lastRun: null,
    reasoningSummary: "No L3 reasoning logged yet.",
  });
  const [l2LastRunOverride, setL2LastRunOverride] = useState<string | null>(
    null,
  );
  const [l3LastRunOverride, setL3LastRunOverride] = useState<string | null>(
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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("l3_agent_last_run");
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as LastRunSummary;
      if (parsed.ranAt) {
        setL3LastRunOverride(parsed.ranAt);
      }
    } catch {
      window.localStorage.removeItem("l3_agent_last_run");
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    try {
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const supabase = createClient();

      const [
        agentsRes,
        l1CountPromise,
        l2CountPromise,
        l2RecentPromise,
        l3FindingsPromise,
        l3EscalatedPromise,
        l3ReasoningPromise,
        l3StagePromise,
        l3FindingsDetailPromise,
      ] = await Promise.all([
        fetch("/api/agent/list", { method: "GET", credentials: "include" }),
        supabase
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .in("action", ["L1_AUTO_CLOSED", "ALERT_ESCALATED"]),
        supabase
          .from("agent_reasoning")
          .select("id", { count: "exact", head: true })
          .eq("agent_level", "L2"),
        supabase
          .from("agent_reasoning")
          .select(
            "id, escalation_id, decision, confidence_score, actions_taken, created_at, iocs_considered",
          )
          .eq("agent_level", "L2")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("hunt_findings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceIso),
        supabase
          .from("hunt_findings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceIso)
          .eq("escalated", true),
        supabase
          .from("agent_reasoning")
          .select("reasoning_text, created_at")
          .eq("agent_level", "L3")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("audit_logs")
          .select("action, metadata, created_at")
          .eq("action", "L3_HUNT_STAGE")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("hunt_findings")
          .select("id, confidence, created_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(12),
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
      const inferredL3Status = mapped[2]?.status || "idle";
      const latestL3ReasoningRow =
        (
          (l3ReasoningPromise.data || []) as Array<{
            reasoning_text: string | null;
            created_at: string;
          }>
        )[0] || null;

      const l3StageRows = (l3StagePromise.data || []) as Array<{
        action: string;
        metadata: unknown;
        created_at: string;
      }>;

      const latestIngestStage = l3StageRows.find((row) => {
        if (!row.metadata || typeof row.metadata !== "object") {
          return false;
        }
        return (row.metadata as { stage?: unknown }).stage === "iocs_ingested";
      });

      const latestPersistStage = l3StageRows.find((row) => {
        if (!row.metadata || typeof row.metadata !== "object") {
          return false;
        }
        return (
          (row.metadata as { stage?: unknown }).stage === "findings_persisted"
        );
      });

      const iocsIngested =
        latestIngestStage?.metadata &&
        typeof latestIngestStage.metadata === "object" &&
        typeof (latestIngestStage.metadata as { total_iocs?: unknown })
          .total_iocs === "number"
          ? ((latestIngestStage.metadata as { total_iocs: number })
              .total_iocs as number)
          : 0;

      const inferredL3Run =
        latestPersistStage?.created_at ||
        latestL3ReasoningRow?.created_at ||
        l3LastRunOverride ||
        mapped[2]?.last_run ||
        null;

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

      setL3Agent({
        id: mapped[2]?.id || "l3-hunter-agent",
        name: "L3 Threat Hunter",
        status: inferredL3Status,
        last_run: inferredL3Run,
      });

      setL1DecisionCount(l1CountPromise.count || 0);
      setL2DecisionCount(l2CountPromise.count || 0);
      setL3FindingCount(l3FindingsPromise.count || 0);
      setL3EscalatedCount(l3EscalatedPromise.count || 0);

      const l3FindingRows = (l3FindingsDetailPromise.data || []) as Array<{
        id: string;
        confidence: number | null;
        created_at: string;
      }>;

      const confidenceScores = l3FindingRows
        .map((row) => row.confidence)
        .filter((value): value is number => typeof value === "number")
        .slice(0, 5);

      setL3Telemetry({
        iocsIngested,
        findings24h: l3FindingsPromise.count || 0,
        confidenceScores,
        lastRun: inferredL3Run,
        reasoningSummary:
          latestL3ReasoningRow?.reasoning_text || "No L3 reasoning logged yet.",
      });

      const l2Rows = (l2RecentPromise.data || []) as Array<{
        id: string;
        escalation_id: string | null;
        decision: string;
        confidence_score: number | null;
        actions_taken: unknown;
        created_at: string;
        iocs_considered: unknown;
      }>;

      const escalationIds = Array.from(
        new Set(
          l2Rows
            .map((row) => row.escalation_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const escalationMap = new Map<
        string,
        { alert_id: string | null; telemetry_snapshot: unknown }
      >();

      if (escalationIds.length > 0) {
        const { data: escalationRows } = await supabase
          .from("escalations")
          .select("id, alert_id, telemetry_snapshot")
          .in("id", escalationIds);

        for (const row of escalationRows || []) {
          escalationMap.set(row.id as string, {
            alert_id:
              typeof (row as { alert_id?: unknown }).alert_id === "string"
                ? ((row as { alert_id: string }).alert_id as string)
                : null,
            telemetry_snapshot: (row as { telemetry_snapshot?: unknown })
              .telemetry_snapshot,
          });
        }
      }

      const decisions = l2Rows.map((row) => {
        const linkedEscalation = row.escalation_id
          ? escalationMap.get(row.escalation_id)
          : undefined;

        const firstAction =
          Array.isArray(row.actions_taken) && row.actions_taken.length > 0
            ? String(row.actions_taken[0])
            : row.decision;

        return {
          id: row.id,
          escalationId: row.escalation_id,
          decision: row.decision,
          confidence: row.confidence_score,
          actionTaken: firstAction,
          createdAt: row.created_at,
          alertSource: extractAlertSource(
            row.iocs_considered,
            linkedEscalation?.telemetry_snapshot,
            linkedEscalation?.alert_id || null,
          ),
        } satisfies L2DecisionItem;
      });

      setL2RecentDecisions(decisions);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [l2LastRunOverride, l3LastRunOverride]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const totalAgents = useMemo(() => 3, []);

  const triggerL1Now = async () => {
    setTriggeringL1(true);
    setErrorText(null);

    try {
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

  const triggerL3Now = async () => {
    setTriggeringL3(true);
    setErrorText(null);

    try {
      const response = await fetch("/api/agent/hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to trigger L3 hunt.");
      }

      const ranAt = new Date().toISOString();
      window.localStorage.setItem(
        "l3_agent_last_run",
        JSON.stringify({ ranAt, summary: payload }),
      );
      setL3LastRunOverride(ranAt);

      await fetchAgents();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setTriggeringL3(false);
    }
  };

  return (
    <div className="p-6 glass flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Agent Command Center</h2>
        <div className="text-xs text-white/60 uppercase tracking-[0.14em]">
          Agents: {totalAgents} | L1 Decisions: {l1DecisionCount} | L2
          Decisions: {l2DecisionCount} | L3 Findings (24h): {l3FindingCount}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading swarm status...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[l1Agent, l2Agent, l3Agent].filter(Boolean).map((agent, index) => (
              <div
                key={agent!.id}
                className="rounded-xl glass p-4 flex flex-col gap-3"
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
                        ? "text-accent border-accent/30 bg-accent/15"
                        : "text-danger border-danger/30 bg-danger/15"
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
                  {index === 2
                    ? `Findings (24h): ${l3FindingCount} | Escalated: ${l3EscalatedCount}`
                    : `Total decisions made: ${index === 0 ? l1DecisionCount : l2DecisionCount}`}
                </p>

                <button
                  type="button"
                  onClick={
                    index === 0
                      ? triggerL1Now
                      : index === 1
                        ? triggerL2Now
                        : triggerL3Now
                  }
                  disabled={
                    index === 0
                      ? triggeringL1
                      : index === 1
                        ? triggeringL2
                        : triggeringL3
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                    index === 2
                      ? "bg-gradient-to-r from-primary to-accent"
                      : "bg-gradient-to-r from-primary to-accent"
                  }`}
                >
                  {(
                    index === 0
                      ? triggeringL1
                      : index === 1
                        ? triggeringL2
                        : triggeringL3
                  ) ? (
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

          <div className="rounded-xl glass p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-white font-semibold">Latest L2 Decisions</h3>
              <span className="text-xs text-white/60">
                Real-time from agent_reasoning
              </span>
            </div>

            {l2RecentDecisions.length === 0 ? (
              <p className="text-xs text-white/60">
                No L2 decisions logged yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {l2RecentDecisions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg glass px-3 py-2 text-xs text-white/80"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {item.decision}
                      </span>
                      <span className="text-white/60">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-white/70">
                      Action: {item.actionTaken}
                    </p>
                    <p className="text-white/70">
                      Confidence:{" "}
                      {typeof item.confidence === "number"
                        ? item.confidence.toFixed(2)
                        : "n/a"}
                    </p>
                    <p className="text-white/70">
                      Alert source: {item.alertSource}
                    </p>
                    <p className="text-white/50">
                      Escalation: {item.escalationId || "n/a"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl glass p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-white font-semibold">
                Latest L3 Hunt Telemetry
              </h3>
              <span className="text-xs text-white/60">
                Real-time from audit_logs + hunt_findings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg glass px-3 py-2 text-xs text-white/80">
                <p className="text-white/60">IOCs ingested</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {l3Telemetry.iocsIngested}
                </p>
              </div>
              <div className="rounded-lg glass px-3 py-2 text-xs text-white/80">
                <p className="text-white/60">Findings (24h)</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {l3Telemetry.findings24h}
                </p>
              </div>
              <div className="rounded-lg glass px-3 py-2 text-xs text-white/80">
                <p className="text-white/60">Confidence scores</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {l3Telemetry.confidenceScores.length > 0
                    ? l3Telemetry.confidenceScores
                        .map((value) => value.toFixed(2))
                        .join(", ")
                    : "n/a"}
                </p>
              </div>
              <div className="rounded-lg glass px-3 py-2 text-xs text-white/80">
                <p className="text-white/60">Last run</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {l3Telemetry.lastRun
                    ? new Date(l3Telemetry.lastRun).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            <div className="rounded-lg glass px-3 py-2 text-xs text-white/80">
              <p className="text-white/60">Reasoning summary</p>
              <p className="mt-1 text-white/90">
                {l3Telemetry.reasoningSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
    </div>
  );
}
