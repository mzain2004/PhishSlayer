"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StepId = 1 | 2 | 3;
type WazuhState = "idle" | "waiting" | "success" | "timeout";

function StepIndicator({ current }: { current: StepId }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3] as StepId[]).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              s < current
                ? "bg-green-500 border-green-500 text-white"
                : s === current
                ? "border-indigo-500 text-indigo-400"
                : "border-zinc-700 text-zinc-600"
            }`}
          >
            {s < current ? "✓" : s}
          </div>
          {s < 3 && <div className={`h-px w-12 ${s < current ? "bg-green-500" : "bg-zinc-800"}`} />}
        </div>
      ))}
    </div>
  );
}

function ReadOnlyCopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 truncate">
          {value}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Step1Wazuh({
  onComplete,
  webhookUrl,
}: {
  onComplete: () => void;
  webhookUrl: string;
}) {
  const [state, setWazuhState] = useState<WazuhState>("idle");
  const [countdown, setCountdown] = useState(30);
  const supabase = createClient();

  const sendTest = async () => {
    setWazuhState("waiting");
    setCountdown(30);

    const channel = supabase
      .channel("wazuh-ping")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "alerts",
        filter: "attack_type=eq.wazuh_test",
      }, () => {
        setWazuhState("success");
        channel.unsubscribe();
        setTimeout(onComplete, 1500);
      })
      .subscribe();

    await fetch("/api/connectors/wazuh/test", { method: "POST" });

    let t = 30;
    const timer = setInterval(() => {
      t--;
      setCountdown(t);
      if (t <= 0) {
        clearInterval(timer);
        if (state !== "success") setWazuhState("timeout");
        channel.unsubscribe();
      }
    }, 1000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Connect Wazuh</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Add this webhook URL to your Wazuh manager's custom-webhook integration.
        </p>
      </div>

      <ReadOnlyCopyField
        label="Wazuh Webhook URL"
        value={webhookUrl}
      />

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Config snippet</p>
        <pre className="text-xs font-mono text-indigo-300 overflow-x-auto">{`<integration>
  <name>custom-webhook</name>
  <hook_url>${webhookUrl}</hook_url>
  <level>7</level>
  <alert_format>json</alert_format>
</integration>`}</pre>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={sendTest}
          disabled={state === "waiting" || state === "success"}
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
        >
          Send Test Alert
        </button>

        {state === "waiting" && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Waiting for ping… {countdown}s
          </div>
        )}
        {state === "success" && (
          <span className="text-sm text-green-400 font-medium">✓ Wazuh connected!</span>
        )}
        {state === "timeout" && (
          <span className="text-sm text-red-400">Timeout — check your Wazuh config above</span>
        )}
      </div>

      {state !== "success" && (
        <button
          onClick={onComplete}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Skip for now (not recommended)
        </button>
      )}
    </div>
  );
}

function Step2Microsoft({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [connected, setConnected] = useState(false);
  const [tenantName, setTenantName] = useState("");

  const handleOAuth = () => {
    const popup = window.open("/api/integrations/microsoft/oauth", "ms-oauth", "width=600,height=700");
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "MICROSOFT_OAUTH_SUCCESS") {
        setConnected(true);
        setTenantName(e.data.tenant_name ?? "Microsoft 365");
        popup?.close();
        window.removeEventListener("message", handler);
        setTimeout(onComplete, 1000);
      }
    };
    window.addEventListener("message", handler);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Connect Microsoft 365</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Optional: enables L2 automated response (revoke sessions, disable accounts).
        </p>
      </div>

      {connected ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/10">
          <span className="text-green-400 text-xl">✓</span>
          <div>
            <p className="text-sm font-medium text-green-400">Connected</p>
            <p className="text-xs text-zinc-400">{tenantName}</p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleOAuth}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 hover:border-indigo-500 text-white transition-colors w-full"
        >
          <span className="text-xl">🪟</span>
          <span className="text-sm font-medium">Connect Microsoft 365</span>
        </button>
      )}

      <button
        onClick={onSkip}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}

function Step3Confirm({
  wazuhConnected,
  msConnected,
  onFinish,
}: {
  wazuhConnected: boolean;
  msConnected: boolean;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">You're ready</h2>
        <p className="text-sm text-zinc-400 mt-1">Your PhishSlayer SOC is configured and operational.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Wazuh Integration</span>
          <span className={`text-sm font-medium ${wazuhConnected ? "text-green-400" : "text-zinc-500"}`}>
            {wazuhConnected ? "✓ Connected" : "Skipped"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Microsoft Graph</span>
          <span className={`text-sm font-medium ${msConnected ? "text-green-400" : "text-zinc-500"}`}>
            {msConnected ? "✓ Connected" : "Skipped"}
          </span>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        Go to Dashboard →
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<StepId>(1);
  const [wazuhConnected, setWazuhConnected] = useState(false);
  const [msConnected, setMsConnected] = useState(false);
  const router = useRouter();

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/connectors/wazuh`
    : "https://your-domain.com/api/connectors/wazuh";

  const handleWazuhComplete = () => {
    setWazuhConnected(true);
    setStep(2);
  };

  const handleMsComplete = () => {
    setMsConnected(true);
    setStep(3);
  };

  const handleFinish = async () => {
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-2">PhishSlayer</p>
          <p className="text-3xl font-bold text-white">Setup your SOC</p>
        </div>

        <StepIndicator current={step} />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          {step === 1 && (
            <Step1Wazuh onComplete={handleWazuhComplete} webhookUrl={webhookUrl} />
          )}
          {step === 2 && (
            <Step2Microsoft onComplete={handleMsComplete} onSkip={() => setStep(3)} />
          )}
          {step === 3 && (
            <Step3Confirm
              wazuhConnected={wazuhConnected}
              msConnected={msConnected}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
