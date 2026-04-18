"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PhishButton from "@/components/ui/PhishButton";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

export default function QuickActionsPanel() {
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticHealth, setDiagnosticHealth] = useState<
    "healthy" | "degraded" | null
  >(null);
  const [diagnosticDetails, setDiagnosticDetails] = useState<{
    timestamp: string;
    uptime: number;
  } | null>(null);
  const [showIsolateConfirm, setShowIsolateConfirm] = useState(false);
  const [isolateLoading, setIsolateLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [isolationReason, setIsolationReason] = useState("");
  const [showBlockIpModal, setShowBlockIpModal] = useState(false);
  const [blockIpLoading, setBlockIpLoading] = useState(false);
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockThreatLevel, setBlockThreatLevel] = useState<
    "low" | "medium" | "high" | "critical"
  >("high");
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateLoading, setEscalateLoading] = useState(false);
  const [escalationTitle, setEscalationTitle] = useState("");
  const [escalationDescription, setEscalationDescription] = useState("");
  const [escalationSeverity, setEscalationSeverity] = useState<
    "low" | "medium" | "high" | "critical"
  >("high");
  const [recommendedAction, setRecommendedAction] = useState<
    "CLOSE" | "ISOLATE_IDENTITY" | "BLOCK_IP" | "MANUAL_REVIEW"
  >("MANUAL_REVIEW");

  const runSystemDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticHealth(null);
    setDiagnosticDetails(null);

    try {
      const response = await fetch("/api/metrics", { method: "POST" });
      const data = await response.json();

      if (!response.ok || data.status !== "ok") {
        throw new Error(data?.error || "Diagnostic check failed");
      }

      setDiagnosticHealth("healthy");
      setDiagnosticDetails({
        timestamp: data.timestamp,
        uptime: Number(data.uptime) || 0,
      });
    } catch {
      setDiagnosticHealth("degraded");
      setDiagnosticDetails({ timestamp: new Date().toISOString(), uptime: 0 });
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const isolateCompromisedNodes = async () => {
    const trimmedTargetUserId = targetUserId.trim();
    const trimmedReason = isolationReason.trim();
    if (!trimmedTargetUserId) {
      toast.error("Target user ID is required");
      return;
    }
    if (!trimmedReason) {
      toast.error("Reason is required");
      return;
    }

    setIsolateLoading(true);
    try {
      const response = await fetch("/api/actions/isolate-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: trimmedTargetUserId,
          reason: trimmedReason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to isolate agents");
      }

      toast.success("Identity isolated successfully");
      setShowIsolateConfirm(false);
      setTargetUserId("");
      setIsolationReason("");
    } catch (error: any) {
      toast.error(error?.message || "Isolation failed.");
    } finally {
      setIsolateLoading(false);
    }
  };

  const submitBlockIp = async () => {
    const ip = blockIp.trim();
    const reason = blockReason.trim();

    if (!ip) {
      toast.error("IP address is required");
      return;
    }
    if (!reason) {
      toast.error("Reason is required");
      return;
    }

    setBlockIpLoading(true);
    try {
      const response = await fetch("/api/actions/block-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason, threatLevel: blockThreatLevel }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to block IP");
      }

      toast.success("IP blocked on Cloudflare");
      setShowBlockIpModal(false);
      setBlockIp("");
      setBlockReason("");
      setBlockThreatLevel("high");
    } catch (error: any) {
      toast.error(error?.message || "Failed to block IP");
    } finally {
      setBlockIpLoading(false);
    }
  };

  const submitEscalation = async () => {
    const title = escalationTitle.trim();
    const description = escalationDescription.trim();

    if (!title) {
      toast.error("Title is required");
      return;
    }
    if (!description) {
      toast.error("Description is required");
      return;
    }

    setEscalateLoading(true);
    try {
      const response = await fetch("/api/actions/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: crypto.randomUUID(),
          severity: escalationSeverity,
          title,
          description,
          recommendedAction,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to escalate alert");
      }

      toast.success("Alert escalated to Discord");
      setShowEscalateModal(false);
      setEscalationTitle("");
      setEscalationDescription("");
      setEscalationSeverity("high");
      setRecommendedAction("MANUAL_REVIEW");
    } catch (error: any) {
      toast.error(error?.message || "Failed to escalate alert");
    } finally {
      setEscalateLoading(false);
    }
  };

  return (
    <DashboardCard className="flex flex-col gap-4">
      <h2 className="dashboard-section-heading mb-2 text-white">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhishButton
          onClick={runSystemDiagnostic}
          disabled={diagnosticLoading}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="rounded-full flex flex-col items-center justify-center gap-3 px-5 py-2 [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-center text-sm font-semibold text-black"
        >
          {diagnosticLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Diagnostic...
            </span>
          ) : (
            "Run System Diagnostic"
          )}
        </PhishButton>
        <PhishButton
          onClick={() => setShowIsolateConfirm(true)}
          disabled={isolateLoading}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="rounded-full flex flex-col items-center justify-center gap-3 px-5 py-2 [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-center text-sm font-semibold text-black"
        >
          {isolateLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Isolating...
            </span>
          ) : (
            "Isolate Compromised Nodes"
          )}
        </PhishButton>
        <PhishButton
          onClick={() => setShowBlockIpModal(true)}
          disabled={blockIpLoading}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="rounded-full flex flex-col items-center justify-center gap-3 px-5 py-2 [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-center text-sm font-semibold text-black"
        >
          {blockIpLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Blocking IP...
            </span>
          ) : (
            "Block Malicious IP"
          )}
        </PhishButton>
        <PhishButton
          onClick={() => setShowEscalateModal(true)}
          disabled={escalateLoading}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="rounded-full flex flex-col items-center justify-center gap-3 px-5 py-2 [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-center text-sm font-semibold text-black"
        >
          {escalateLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Escalating...
            </span>
          ) : (
            "Escalate to SOC"
          )}
        </PhishButton>
      </div>

      {diagnosticHealth && (
        <div className="mt-1">
          <StatusBadge
            status={diagnosticHealth === "healthy" ? "healthy" : "warning"}
            label={`${diagnosticHealth === "healthy" ? "Healthy" : "Degraded"}${
              diagnosticDetails
                ? ` | Up ${diagnosticDetails.uptime}s | ${new Date(
                    diagnosticDetails.timestamp,
                  ).toLocaleTimeString()}`
                : ""
            }`}
          />
        </div>
      )}

      {showIsolateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12161d] p-5 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Confirm Isolation</h3>
            <p className="mt-2 text-sm text-slate-300">
              This will isolate the target identity, revoke all sessions, and
              ban their account. This action is irreversible. Confirm?
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="targetUserId"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Target User ID
                </label>
                <input
                  id="targetUserId"
                  type="text"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#2DD4BF]/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="isolationReason"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Reason
                </label>
                <input
                  id="isolationReason"
                  type="text"
                  value={isolationReason}
                  onChange={(event) => setIsolationReason(event.target.value)}
                  placeholder="Explain why this identity must be isolated"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#2DD4BF]/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <PhishButton
                variant="secondary"
                onClick={() => setShowIsolateConfirm(false)}
                disabled={isolateLoading}
                className="px-4 py-2 text-sm"
              >
                Cancel
              </PhishButton>
              <PhishButton
                variant="danger"
                onClick={isolateCompromisedNodes}
                disabled={isolateLoading}
                className="px-4 py-2 text-sm"
              >
                {isolateLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </span>
                ) : (
                  "Yes, Isolate All"
                )}
              </PhishButton>
            </div>
          </motion.div>
        </div>
      )}

      {showBlockIpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12161d] p-5 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Block Malicious IP</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="blockIp"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  IP Address
                </label>
                <input
                  id="blockIp"
                  type="text"
                  value={blockIp}
                  onChange={(event) => setBlockIp(event.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#2DD4BF]/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="blockReason"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Reason
                </label>
                <input
                  id="blockReason"
                  type="text"
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  placeholder="Suspicious brute-force pattern"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#2DD4BF]/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="threatLevel"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Threat Level
                </label>
                <select
                  id="threatLevel"
                  value={blockThreatLevel}
                  onChange={(event) =>
                    setBlockThreatLevel(
                      event.target.value as
                        | "low"
                        | "medium"
                        | "high"
                        | "critical",
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#2DD4BF]/60 focus:outline-none"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <PhishButton
                variant="secondary"
                onClick={() => setShowBlockIpModal(false)}
                disabled={blockIpLoading}
                className="px-4 py-2 text-sm"
              >
                Cancel
              </PhishButton>
              <PhishButton
                variant="danger"
                onClick={submitBlockIp}
                disabled={blockIpLoading}
                className="px-4 py-2 text-sm"
              >
                {blockIpLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Blocking...
                  </span>
                ) : (
                  "Confirm Block"
                )}
              </PhishButton>
            </div>
          </motion.div>
        </div>
      )}

      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12161d] p-5 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Escalate to SOC</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="escalationTitle"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Title
                </label>
                <input
                  id="escalationTitle"
                  type="text"
                  value={escalationTitle}
                  onChange={(event) => setEscalationTitle(event.target.value)}
                  placeholder="Credential abuse detected"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#2DD4BF]/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="escalationDescription"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Description
                </label>
                <textarea
                  id="escalationDescription"
                  value={escalationDescription}
                  onChange={(event) =>
                    setEscalationDescription(event.target.value)
                  }
                  rows={3}
                  placeholder="Describe what happened and why escalation is needed"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#2DD4BF]/60 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="escalationSeverity"
                    className="mb-1 block text-xs font-medium text-slate-300"
                  >
                    Severity
                  </label>
                  <select
                    id="escalationSeverity"
                    value={escalationSeverity}
                    onChange={(event) =>
                      setEscalationSeverity(
                        event.target.value as
                          | "low"
                          | "medium"
                          | "high"
                          | "critical",
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#2DD4BF]/60 focus:outline-none"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="recommendedAction"
                    className="mb-1 block text-xs font-medium text-slate-300"
                  >
                    Recommended Action
                  </label>
                  <select
                    id="recommendedAction"
                    value={recommendedAction}
                    onChange={(event) =>
                      setRecommendedAction(
                        event.target.value as
                          | "CLOSE"
                          | "ISOLATE_IDENTITY"
                          | "BLOCK_IP"
                          | "MANUAL_REVIEW",
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#2DD4BF]/60 focus:outline-none"
                  >
                    <option value="CLOSE">CLOSE</option>
                    <option value="ISOLATE_IDENTITY">ISOLATE_IDENTITY</option>
                    <option value="BLOCK_IP">BLOCK_IP</option>
                    <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <PhishButton
                variant="secondary"
                onClick={() => setShowEscalateModal(false)}
                disabled={escalateLoading}
                className="px-4 py-2 text-sm"
              >
                Cancel
              </PhishButton>
              <PhishButton
                variant="danger"
                onClick={submitEscalation}
                disabled={escalateLoading}
                className="px-4 py-2 text-sm"
              >
                {escalateLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Escalating...
                  </span>
                ) : (
                  "Escalate"
                )}
              </PhishButton>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardCard>
  );
}
