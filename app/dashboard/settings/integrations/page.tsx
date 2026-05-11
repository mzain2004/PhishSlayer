"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { ConnectModal } from "@/components/integrations/ConnectModal";
import { MarketplaceTool } from "@/lib/mcp-tools";
import { Input } from "@/components/ui/input";

type MarketplaceResponse = {
  orgTier: "free" | "soc_pro" | "command_center";
  tools: MarketplaceTool[];
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  soc_pro: "SOC Pro",
  command_center: "Command Center",
};

function getTierToolAccessCount(
  tier: string,
  tools: MarketplaceTool[]
): number {
  return tools.filter(
    (tool) =>
      tool.tier === "free" ||
      (tool.tier === "pro" &&
        ["soc_pro", "command_center"].includes(tier))
  ).length;
}

export default function IntegrationsPage() {
  const [tools, setTools] = useState<MarketplaceTool[]>([]);
  const [orgTier, setOrgTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [connectingTool, setConnectingTool] = useState<MarketplaceTool | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [testingTool, setTestingTool] = useState<string | null>(null);

  async function fetchTools() {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/marketplace");
      if (!response.ok) throw new Error("Failed to fetch marketplace");
      const data: MarketplaceResponse = await response.json();
      setOrgTier(data.orgTier);
      setTools(data.tools);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load integrations"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTools();
  }, []);

  const handleConnect = (tool: MarketplaceTool) => {
    setConnectingTool(tool);
    setShowModal(true);
  };

  const handleDisconnect = async (tool: MarketplaceTool) => {
    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: tool.id }),
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      toast.success(`Disconnected from ${tool.name}`);
      fetchTools();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to disconnect integration"
      );
    }
  };

  const handleTest = async (tool: MarketplaceTool) => {
    setTestingTool(tool.id);
    try {
      const response = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: tool.id }),
      });

      if (!response.ok) throw new Error("Connection test failed");

      const data = await response.json();
      return { success: data.success, latency_ms: data.latency_ms };
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Connection test failed"
      );
      return { success: false, latency_ms: 0 };
    } finally {
      setTestingTool(null);
    }
  };

  // Filter tools
  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || tool.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group by category
  const categories = [
    ...new Set(tools.map((t) => t.category)),
  ] as string[];
  const toolsByCategory = categories.reduce<Record<string, MarketplaceTool[]>>(
    (acc, cat) => {
      acc[cat] = filteredTools.filter((t) => t.category === cat);
      return acc;
    },
    {}
  );

  const connectedCount = tools.filter((t) => t.connected || t.shared).length;
  const accessibleCount = getTierToolAccessCount(orgTier ?? "free", tools);

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          MCP Tools Marketplace
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect to {accessibleCount} tools with{" "}
          <span className="font-semibold">{TIER_LABELS[orgTier ?? "free"]}</span>{" "}
          tier • {connectedCount} connected
        </p>
      </div>

      {/* Search and filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              All ({filteredTools.length})
            </button>
            {categories.map((category) => {
              const count = toolsByCategory[category]?.length ?? 0;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {category.replace(/_/g, " ")} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tools grid */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tools...
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? "No tools found matching your search"
              : "No tools available"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryTools = toolsByCategory[category] ?? [];
            if (categoryTools.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {category.replace(/_/g, " ")}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTools.map((tool) => {
                    const userHasAccess =
                      tool.tier === "free" ||
                      (tool.tier === "pro" &&
                        ["soc_pro", "command_center"].includes(orgTier ?? ""));

                    return (
                      <IntegrationCard
                        key={tool.id}
                        tool={tool}
                        userTierHasAccess={userHasAccess}
                        onConnect={() => handleConnect(tool)}
                        onDisconnect={() => handleDisconnect(tool)}
                        onTest={async () => {
                          const result = await handleTest(tool);
                          return result;
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect modal */}
      <ConnectModal
        tool={connectingTool}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setConnectingTool(null);
        }}
        onSuccess={() => {
          fetchTools();
        }}
      />
    </div>
  );
}
