"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IArrowRight,
  ICheck,
  ICopy,
  IExternal,
  ILock,
  IX,
} from "@/components/ui/icons";

type StepId = 1 | 2 | 3;
type WazuhState = "idle" | "waiting" | "success" | "timeout";

const MS_SCOPES = [
  "User.Read.All",
  "AuditLog.Read.All",
  "Directory.Read.All",
  "IdentityRiskEvent.Read.All",
];

function SummaryRow({
  icon,
  label,
  value,
  ok,
  muted,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="ob2-sum-row">
      <span
        className="ob2-sum-icon"
        style={{
          color: ok
            ? "#86EFAC"
            : muted
              ? "var(--text-tertiary)"
              : "var(--text-secondary)",
        }}
      >
        {icon}
      </span>
      <span className="ob2-sum-label">{label}</span>
      <span
        className="ob2-sum-value"
        style={{
          color: ok
            ? "#86EFAC"
            : muted
              ? "var(--text-tertiary)"
              : "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Step1Wazuh({
  webhookUrl,
  onComplete,
}: {
  webhookUrl: string;
  onComplete: () => void;
}) {
  const [wazuhState, setWazuhState] = useState<WazuhState>("idle");
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleTest = async () => {
    setWazuhState("waiting");

    const channel = supabase
      .channel("wazuh-ping")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: "attack_type=eq.wazuh_test",
        },
        () => {
          setWazuhState("success");
          channel.unsubscribe();
          setTimeout(onComplete, 1500);
        },
      )
      .subscribe();

    await fetch("/api/connectors/wazuh/test", { method: "POST" }).catch(
      () => {},
    );

    let t = 30;
    const timer = setInterval(() => {
      t--;
      if (t <= 0) {
        clearInterval(timer);
        setWazuhState((prev) => (prev === "success" ? "success" : "timeout"));
        channel.unsubscribe();
      }
    }, 1000);
  };

  const connected = wazuhState === "success";
  const testing = wazuhState === "waiting";

  return (
    <>
      <h2 className="ob2-title">Connect your Wazuh instance</h2>
      <p className="ob2-sub">
        Paste this webhook URL into your Wazuh manager configuration
      </p>

      <div className="ob2-url-box">
        <div className="ob2-url-label">Webhook endpoint</div>
        <div className="ob2-url-field">
          <code>{webhookUrl}</code>
          <button
            className={`ob2-copy ${copied ? "done" : ""}`}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <ICheck size={12} /> Copied
              </>
            ) : (
              <>
                <ICopy size={12} /> Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="ob2-divider">
        <span>Then send a test alert to verify</span>
      </div>

      <button
        className={`btn ${testing || connected ? "" : "primary"}`}
        style={{ width: "100%", justifyContent: "center", padding: 12 }}
        onClick={handleTest}
        disabled={testing || connected}
      >
        {testing
          ? "Sending test alert..."
          : connected
            ? "✓ Test received"
            : "Send test alert"}
      </button>

      <div
        className={`ob2-status ${testing ? "waiting" : connected ? "success" : "idle"}`}
      >
        <span className="ob2-status-dot" />
        {wazuhState === "timeout"
          ? "Timeout — check your Wazuh config above"
          : testing
            ? "Waiting for first alert..."
            : connected
              ? "Connected — Wazuh webhook verified"
              : "Waiting for first alert..."}
      </div>

      <div className="ob2-footer">
        <button
          className="btn ghost"
          style={{ color: "var(--text-tertiary)", fontSize: 12 }}
          onClick={onComplete}
        >
          Skip for now
        </button>
        <button
          className="btn primary"
          disabled={!connected}
          onClick={onComplete}
        >
          Continue <IArrowRight size={13} />
        </button>
      </div>
    </>
  );
}

function Step2Microsoft({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [graphConnected, setGraphConnected] = useState(false);

  const handleOAuth = () => {
    const popup = window.open(
      "/api/integrations/microsoft/oauth",
      "ms-oauth",
      "width=600,height=700",
    );
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "MICROSOFT_OAUTH_SUCCESS") {
        setGraphConnected(true);
        popup?.close();
        window.removeEventListener("message", handler);
        setTimeout(onComplete, 600);
      }
    };
    window.addEventListener("message", handler);
  };

  return (
    <>
      <h2 className="ob2-title">Connect Microsoft 365</h2>
      <p className="ob2-sub">
        Enables identity anomaly detection, sign-in log analysis, and L2
        remediation actions via Microsoft Graph.
      </p>

      <div className="ob2-perms">
        <div className="ob2-perm-label">Required permissions</div>
        <div className="ob2-perm-list">
          {MS_SCOPES.map((p) => (
            <span key={p} className="ob2-perm">
              {p}
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn primary"
        style={{
          width: "100%",
          justifyContent: "center",
          padding: 14,
          fontSize: 14,
        }}
        onClick={handleOAuth}
      >
        {graphConnected ? (
          <>
            <ICheck size={14} /> Connected
          </>
        ) : (
          <>
            Connect Microsoft 365 <IExternal size={13} />
          </>
        )}
      </button>

      <div className="ob2-or">
        <div className="ob2-or-line" />
        <span>OR</span>
        <div className="ob2-or-line" />
      </div>

      <button
        className="btn ghost"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={onSkip}
      >
        Skip Microsoft Graph for now <IArrowRight size={13} />
      </button>
    </>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<StepId>(1);
  const [wazuhConnected, setWazuhConnected] = useState(false);
  const [graphConnected, setGraphConnected] = useState(false);
  const router = useRouter();

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/connectors/wazuh`
      : "https://phishslayer.tech/api/connectors/wazuh";

  const steps = [
    { num: 1, label: "Connect Wazuh", done: step > 1 },
    { num: 2, label: "Connect Microsoft 365", done: step > 2 },
    { num: 3, label: "Ready", done: false },
  ] as const;

  const handleWazuhDone = () => {
    setWazuhConnected(true);
    setStep(2);
  };

  const handleMsDone = () => {
    setGraphConnected(true);
    setStep(3);
  };

  const handleFinish = async () => {
    await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
    router.push("/dashboard/alerts");
  };

  return (
    <div className="ob2-wrap">
      <header className="ob2-topbar">
        <div className="brand">
          <div className="logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M9 12 L11 14 L15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="name">PhishSlayer</span>
          <span className="ver">v0.6.2</span>
        </div>
      </header>

      <div className="ob2-steps">
        {steps.map((s, i) => (
          <Fragment key={s.num}>
            <div
              className={`ob2-step ${step === s.num ? "active" : ""} ${s.done ? "done" : ""}`}
            >
              <div className="ob2-step-num">
                {s.done ? <ICheck size={12} /> : s.num}
              </div>
              <span className="ob2-step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ob2-step-line ${s.done ? "done" : ""}`} />
            )}
          </Fragment>
        ))}
      </div>

      <div className="ob2-card">
        {step === 1 && (
          <Step1Wazuh webhookUrl={webhookUrl} onComplete={handleWazuhDone} />
        )}
        {step === 2 && (
          <Step2Microsoft onComplete={handleMsDone} onSkip={() => setStep(3)} />
        )}
        {step === 3 && (
          <>
            <h2 className="ob2-title">You&rsquo;re ready</h2>
            <p className="ob2-sub">
              PhishSlayer is now active and monitoring your infrastructure.
            </p>

            <div className="ob2-summary">
              <SummaryRow
                icon={<ICheck size={13} />}
                label="Wazuh"
                value={wazuhConnected ? "Connected" : "Skipped"}
                ok={wazuhConnected}
                muted={!wazuhConnected}
              />
              <SummaryRow
                icon={graphConnected ? <ICheck size={13} /> : <IX size={13} />}
                label="Microsoft 365"
                value={graphConnected ? "Connected" : "Skipped"}
                ok={graphConnected}
                muted={!graphConnected}
              />
              <SummaryRow label="Plan" value="SOC Pro · $1,499/mo" />
              <SummaryRow
                icon={<ICheck size={13} />}
                label="Agents"
                value="L1 + L2 + L3 active"
                ok
              />
            </div>

            <button
              className="btn primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: 14,
                fontSize: 14,
                marginTop: 8,
              }}
              onClick={handleFinish}
            >
              Go to dashboard <IArrowRight size={14} />
            </button>
          </>
        )}
      </div>

      <div className="ob2-trust">
        <ILock size={10} /> SOC 2 Type II certified · AES-256 encryption at rest
        · EU data residency available
      </div>
    </div>
  );
}
