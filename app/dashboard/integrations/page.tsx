"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Plug,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import DashboardCard from "@/components/dashboard/DashboardCard";
import PhishButton from "@/components/ui/PhishButton";

type TenantInfo = {
  id: string;
  name: string;
  role: "owner" | "admin" | "analyst";
};

type IntegrationRecord = {
  id: string;
  name: string;
  manager_ip: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  status: "Active" | "Inactive";
};

type IntegrationsResponse = {
  success: boolean;
  tenant?: TenantInfo;
  webhook_url?: string;
  integrations?: IntegrationRecord[];
  error?: string;
};

const STEP_TITLES = [
  "Step 1: Name Your Integration",
  "Step 2: Generate API Key",
  "Step 3: Configure Wazuh Manager",
];

function formatLastSeen(lastSeen: string | null) {
  if (!lastSeen) {
    return "Never";
  }

  const parsed = new Date(lastSeen);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString();
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState(1);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [name, setName] = useState("");
  const [managerIp, setManagerIp] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedIntegrationId, setGeneratedIntegrationId] = useState<
    string | null
  >(null);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wazuh", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as IntegrationsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load integrations");
      }

      setTenant(data.tenant || null);
      setIntegrations(data.integrations || []);
      setWebhookUrl(data.webhook_url || "");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not load Wazuh integrations";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const ossecSnippet = useMemo(() => {
    const integrationName = name.trim().length > 0 ? name.trim() : "HQ Network";

    return `<integration>
  <name>custom-webhook</name>
  <hook_url>${webhookUrl}</hook_url>
  <level>7</level>
  <alert_format>json</alert_format>
  <api_key>${generatedKey || "REPLACE_WITH_GENERATED_KEY"}</api_key>
  <!-- Tenant: ${tenant?.id || "REPLACE_WITH_TENANT_UUID"} | Manager Name: ${integrationName} -->
</integration>`;
  }, [generatedKey, name, tenant?.id, webhookUrl]);

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Clipboard copy failed");
    }
  }

  async function handleGenerateKey() {
    if (!name.trim()) {
      toast.error("Please provide an integration name first.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/integrations/wazuh/generate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          manager_ip: managerIp.trim() || null,
          tenant_id: tenant?.id || undefined,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        api_key?: string;
        integration_id?: string;
        webhook_url?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to generate integration key");
      }

      setGeneratedKey(payload.api_key || null);
      setGeneratedIntegrationId(payload.integration_id || null);
      setWebhookUrl(payload.webhook_url || webhookUrl);
      setWizardStep(2);

      toast.success("Wazuh API key generated. Save it now.");
      await loadIntegrations();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate Wazuh API key";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function resetWizard() {
    setWizardStep(1);
    setName("");
    setManagerIp("");
    setGeneratedKey(null);
    setGeneratedIntegrationId(null);
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div>
        <h1 className="dashboard-page-title flex items-center gap-2 text-white">
          <Plug className="h-6 w-6 text-[#7c6af7]" />
          Integrations
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Configure tenant-scoped Wazuh webhook integrations with one-time API
          keys.
        </p>
      </div>

      <DashboardCard className="border-[#7c6af7]/30 bg-[#0a0a0f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Wazuh Onboarding Wizard
          </h2>
          <span className="rounded-full border border-[#7c6af7]/40 bg-[#7c6af7]/10 px-3 py-1 text-xs text-[#c5bdfd]">
            {STEP_TITLES[wizardStep - 1]}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          {[1, 2, 3].map((step) => {
            const isActive = step === wizardStep;
            const isComplete = step < wizardStep;

            return (
              <div
                key={step}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  isActive
                    ? "border-[#7c6af7] bg-[#7c6af7]/15 text-white"
                    : isComplete
                      ? "border-[#7c6af7]/30 bg-[#7c6af7]/5 text-[#c5bdfd]"
                      : "border-white/10 bg-white/[0.02] text-slate-400"
                }`}
              >
                {STEP_TITLES[step - 1]}
              </div>
            );
          })}
        </div>

        {wizardStep === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-200">
                Integration Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="HQ Network"
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-[#7c6af7] focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-200">
                Wazuh Manager IP (optional)
              </label>
              <input
                value={managerIp}
                onChange={(event) => setManagerIp(event.target.value)}
                placeholder="192.168.10.25"
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-[#7c6af7] focus:ring-2"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <PhishButton
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="rounded-lg bg-[#7c6af7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8b7af8]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Generate API Key
                  </>
                )}
              </PhishButton>
            </div>
          </div>
        ) : null}

        {wizardStep === 2 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Save this key, it will not be shown again.
              </div>
              The plaintext key is displayed once for secure handoff into your
              Wazuh manager config.
            </div>

            <div className="rounded-lg border border-white/15 bg-black/30 p-3">
              <p className="mb-2 text-xs text-slate-400">Generated API Key</p>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <code className="block flex-1 overflow-x-auto rounded-md bg-black/50 px-3 py-2 text-xs text-[#c5bdfd]">
                  {generatedKey || "No key generated"}
                </code>
                <PhishButton
                  onClick={() =>
                    generatedKey
                      ? copyToClipboard(generatedKey, "API key copied")
                      : toast.error("No key available to copy")
                  }
                  className="rounded-lg border border-[#7c6af7]/40 bg-[#7c6af7]/20 px-3 py-2 text-xs text-[#d8d2fe]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Key
                </PhishButton>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <PhishButton
                onClick={() => setWizardStep(3)}
                className="rounded-lg bg-[#7c6af7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8b7af8]"
              >
                Continue to Config Snippet
              </PhishButton>
              <PhishButton
                onClick={resetWizard}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-200"
              >
                Start Over
              </PhishButton>
            </div>
          </div>
        ) : null}

        {wizardStep === 3 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/15 bg-black/30 p-3">
              <p className="mb-2 text-xs text-slate-400">Webhook URL</p>
              <code className="block overflow-x-auto rounded-md bg-black/50 px-3 py-2 text-xs text-[#c5bdfd]">
                {webhookUrl}
              </code>
            </div>

            <div className="rounded-lg border border-white/15 bg-black/30 p-3">
              <p className="mb-2 text-xs text-slate-400">ossec.conf snippet</p>
              <pre className="overflow-x-auto rounded-md bg-black/50 p-3 text-xs text-[#c5bdfd]">
                {ossecSnippet}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <PhishButton
                  onClick={() =>
                    copyToClipboard(ossecSnippet, "ossec.conf snippet copied")
                  }
                  className="rounded-lg border border-[#7c6af7]/40 bg-[#7c6af7]/20 px-3 py-2 text-xs text-[#d8d2fe]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Snippet
                </PhishButton>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-300">
              <p>
                Integration ID:{" "}
                <span className="text-[#d8d2fe]">
                  {generatedIntegrationId || "n/a"}
                </span>
              </p>
              <p>
                Tenant ID:{" "}
                <span className="text-[#d8d2fe]">{tenant?.id || "n/a"}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <PhishButton
                onClick={resetWizard}
                className="rounded-lg bg-[#7c6af7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8b7af8]"
              >
                Add Another Integration
              </PhishButton>
            </div>
          </div>
        ) : null}
      </DashboardCard>

      <DashboardCard className="border-white/10 bg-[#0a0a0f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Configured Integrations
          </h2>
          <span className="text-xs text-slate-400">
            Tenant: {tenant?.name || "Unknown"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading integrations...
          </div>
        ) : integrations.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
            No Wazuh integrations configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {integration.name}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      integration.is_active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {integration.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p>
                    <span className="text-slate-400">Manager:</span>{" "}
                    {integration.manager_ip || integration.name}
                  </p>
                  <p>
                    <span className="text-slate-400">Last seen:</span>{" "}
                    {formatLastSeen(integration.last_seen_at)}
                  </p>
                  <p>
                    <span className="text-slate-400">Webhook:</span>{" "}
                    <span className="inline-flex items-center gap-1 text-[#c5bdfd]">
                      <Link2 className="h-3 w-3" />
                      {webhookUrl || "Not available"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
