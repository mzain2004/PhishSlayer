"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, Loader2, Server } from "lucide-react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

type AssetRecord = {
  id: string;
  asset_type: string;
  hostname: string | null;
  ip_addresses: string[];
  mac_address: string | null;
  os: string | null;
  os_version: string | null;
  owner_user_id: string | null;
  department: string | null;
  criticality: "critical" | "high" | "medium" | "low" | string;
  tags: string[];
  connected_connector_ids: string[];
  last_seen: string | null;
  first_seen: string | null;
  is_active: boolean;
  created_at: string;
};

type AssetsResponse = {
  data: AssetRecord[];
  count: number;
  page: number;
  limit: number;
  error?: string;
};

const ASSET_TYPES = [
  "all",
  "endpoint",
  "server",
  "network_device",
  "cloud_resource",
  "saas_app",
  "identity",
];

const CRITICALITY_LEVELS = ["all", "critical", "high", "medium", "low"];

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

function assetTypeLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default function AssetsPage() {
  const { userId } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const orgId = organization?.id || null;
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAssets = useCallback(async () => {
    if (!userId || !orgId) {
      setAssets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText(null);

    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (criticalityFilter !== "all")
        params.set("criticality", criticalityFilter);
      params.set("page", String(page));

      const response = await fetch(`/api/assets?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as AssetsResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load assets");
      }

      setAssets(payload.data || []);
      setTotalCount(payload.count || 0);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Unable to load assets",
      );
    } finally {
      setLoading(false);
    }
  }, [criticalityFilter, orgId, page, typeFilter, userId]);

  useEffect(() => {
    if (!orgLoaded) return;
    void fetchAssets();
  }, [fetchAssets, orgLoaded]);

  const filteredAssets = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return assets;

    return assets.filter((asset) => {
      const hostname = asset.hostname?.toLowerCase() || "";
      const ipMatch = asset.ip_addresses?.some((ip) =>
        ip.toLowerCase().includes(search),
      );
      return hostname.includes(search) || ipMatch;
    });
  }, [assets, searchText]);

  const summary = useMemo(() => {
    const active = filteredAssets.filter((asset) => asset.is_active).length;
    const critical = filteredAssets.filter(
      (asset) => asset.criticality === "critical",
    ).length;
    const servers = filteredAssets.filter(
      (asset) => asset.asset_type === "server",
    ).length;

    return {
      total: filteredAssets.length,
      active,
      critical,
      servers,
    };
  }, [filteredAssets]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 50));

  return (
    <div className="flex flex-col gap-6 text-white">
      <div>
        <h1 className="dashboard-page-title flex items-center gap-2 text-white">
          <Server className="h-6 w-6 text-[#7c6af7]" />
          Assets
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Real-time inventory of endpoints, servers, and cloud assets scoped to
          your organization.
        </p>
      </div>

      <DashboardCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="dashboard-section-heading text-white">
            Inventory Snapshot
          </h2>
          <span className="text-xs text-slate-400">
            Organization: {organization?.name || "Not selected"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Total Assets</p>
            <p className="dashboard-metric-value">{summary.total}</p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Active</p>
            <p className="dashboard-metric-value text-emerald-300">
              {summary.active}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Critical</p>
            <p className="dashboard-metric-value text-red-300">
              {summary.critical}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 px-3 py-2">
            <p className="dashboard-card-label">Servers</p>
            <p className="dashboard-metric-value text-sky-300">
              {summary.servers}
            </p>
          </DashboardCard>
        </div>
      </DashboardCard>

      <DashboardCard className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={typeFilter}
            onChange={(event) => {
              setPage(1);
              setTypeFilter(event.target.value);
            }}
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            {ASSET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "All Asset Types" : assetTypeLabel(type)}
              </option>
            ))}
          </select>

          <select
            value={criticalityFilter}
            onChange={(event) => {
              setPage(1);
              setCriticalityFilter(event.target.value);
            }}
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          >
            {CRITICALITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level === "all" ? "All Criticality" : level}
              </option>
            ))}
          </select>

          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search hostname or IP"
            className="rounded-xl border border-[rgba(48,54,61,0.9)] bg-black/30 px-3 py-2 text-sm"
          />
        </div>
      </DashboardCard>

      {!orgLoaded ? (
        <DashboardCard className="text-white/70">
          Loading organization...
        </DashboardCard>
      ) : !orgId ? (
        <DashboardCard className="text-white/70">
          Select an organization to view asset inventory.
        </DashboardCard>
      ) : loading ? (
        <DashboardCard className="text-white/70 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading asset inventory...
        </DashboardCard>
      ) : filteredAssets.length === 0 ? (
        <DashboardCard className="text-white/70">
          No assets match the current filters.
        </DashboardCard>
      ) : (
        <DashboardCard className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Asset
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Type
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Criticality
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Last Seen
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-white">
                        {asset.hostname ||
                          asset.ip_addresses?.[0] ||
                          "Unnamed Asset"}
                      </span>
                      <span className="text-[10px] text-[#8B949E] font-mono">
                        {asset.ip_addresses?.length
                          ? asset.ip_addresses.join(", ")
                          : "No IPs"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <Database className="h-3.5 w-3.5 text-slate-400" />
                      {assetTypeLabel(asset.asset_type)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      status={asset.criticality}
                      label={asset.criticality}
                    />
                  </td>
                  <td className="px-4 py-4 text-xs text-white/70">
                    {formatDateTime(asset.last_seen)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      status={asset.is_active ? "healthy" : "pending"}
                      label={asset.is_active ? "active" : "idle"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

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
