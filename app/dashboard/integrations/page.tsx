"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plug, ShieldCheck } from "lucide-react";
import { useOrganization } from "@clerk/nextjs";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { registry } from "@/lib/connectors/registry";

type ConnectorConfig = {
  id: string;
  vendor: string;
  connector_type: string;
  display_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  config: Record<string, string>;
};

type ApiError = {
  error?: string;
};

const VENDOR_LABELS: Record<string, string> = {
  crowdstrike: "CrowdStrike",
  sentinelone: "SentinelOne",
  microsoft: "Microsoft Defender",
  carbonblack: "Carbon Black",
  splunk: "Splunk",
  elastic: "Elastic",
  paloalto: "Palo Alto",
  fortinet: "Fortinet",
  pfsense: "pfSense",
  wazuh: "Wazuh",
};

const VENDOR_TYPES: Record<string, string> = {
  crowdstrike: "EDR",
  sentinelone: "EDR",
  microsoft: "EDR/SIEM",
  carbonblack: "EDR",
  splunk: "SIEM",
  elastic: "SIEM",
  paloalto: "Firewall",
  fortinet: "Firewall",
  pfsense: "Firewall",
  wazuh: "Wazuh",
};

const SUPPORTED_VENDORS = [
  "crowdstrike",
  "sentinelone",
  "microsoft",
  "carbonblack",
  "splunk",
  "elastic",
  "paloalto",
  "fortinet",
  "pfsense",
];

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

export default function IntegrationsPage() {
  const { organization, isLoaded } = useOrganization();
  const orgId = organization?.id || null;
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);

  const connectorCatalog = useMemo(() => {
    const entries = [...SUPPORTED_VENDORS, "wazuh"];
    return entries.map((vendor) => ({
      vendor,
      label: VENDOR_LABELS[vendor] || vendor,
      type: VENDOR_TYPES[vendor] || "Connector",
    }));
  }, []);

  const liveConnectors = useMemo(() => {
    if (!orgId) return [];
    return registry.listByOrg(orgId);
  }, [orgId]);

  const loadConnectors = useCallback(async () => {
    if (!orgId) {
      setConnectors([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/connectors", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ConnectorConfig[] | ApiError;

      if (!response.ok) {
        throw new Error(
          (payload as ApiError)?.error || "Failed to load connectors",
        );
      }

      setConnectors(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Unable to load connectors",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadConnectors();
  }, [isLoaded, loadConnectors]);

  const configuredSummary = useMemo(() => {
    const active = connectors.filter((connector) => connector.is_active).length;
    const inactive = connectors.length - active;
    return { total: connectors.length, active, inactive };
  }, [connectors]);

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div>
        <h1 className="dashboard-page-title flex items-center gap-2 text-white">
          <Plug className="h-6 w-6 text-[#7c6af7]" />
          Integrations
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Monitor connector configuration, live status, and catalog coverage for
          your organization.
        </p>
      </div>

      <DashboardCard className="border-[#7c6af7]/30 bg-[#0a0a0f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Connector Registry
          </h2>
          <span className="text-xs text-slate-400">
            Organization: {organization?.name || "Not selected"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {connectorCatalog.map((entry) => (
            <div
              key={entry.vendor}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {entry.label}
                </p>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {entry.type}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Vendor ID: {entry.vendor}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Live Sessions</p>
            <StatusBadge
              status={liveConnectors.length > 0 ? "healthy" : "pending"}
              label={`${liveConnectors.length} active`}
            />
          </div>
          {liveConnectors.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              No live connectors registered in memory yet.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {liveConnectors.map((connector) => (
                <div
                  key={connector.id}
                  className="rounded-md border border-white/10 bg-black/30 px-3 py-2"
                >
                  <p className="text-sm text-white">{connector.name}</p>
                  <p className="text-xs text-slate-400">
                    {connector.vendor} · {connector.type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard className="border-white/10 bg-[#0a0a0f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Configured Integrations
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            {configuredSummary.active} active · {configuredSummary.inactive}{" "}
            idle
          </div>
        </div>

        {!isLoaded ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading organization...
          </div>
        ) : !orgId ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
            Select an organization in Clerk to view configured connectors.
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`connector-skeleton-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-4 animate-pulse"
              >
                <div className="h-4 w-1/2 rounded bg-white/10" />
                <div className="mt-3 h-3 w-1/3 rounded bg-white/10" />
                <div className="mt-2 h-3 w-2/3 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : connectors.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
            No connectors configured yet. Add one via the API to populate this
            view.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {connectors.map((connector) => (
              <div
                key={connector.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {connector.display_name ||
                      VENDOR_LABELS[connector.vendor] ||
                      connector.vendor}
                  </h3>
                  <StatusBadge
                    status={connector.is_active ? "healthy" : "pending"}
                    label={connector.is_active ? "active" : "idle"}
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p>
                    <span className="text-slate-400">Type:</span>{" "}
                    {connector.connector_type.toUpperCase()}
                  </p>
                  <p>
                    <span className="text-slate-400">Vendor:</span>{" "}
                    {VENDOR_LABELS[connector.vendor] || connector.vendor}
                  </p>
                  <p>
                    <span className="text-slate-400">Last Sync:</span>{" "}
                    {formatTimestamp(connector.last_synced_at)}
                  </p>
                  <p>
                    <span className="text-slate-400">Secrets:</span>{" "}
                    {Object.keys(connector.config || {}).length} masked field(s)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      {errorText ? (
        <DashboardCard className="border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {errorText}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
