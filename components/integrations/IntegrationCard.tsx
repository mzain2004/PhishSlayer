"use client";

import React, { useState } from "react";
import { MarketplaceTool } from "@/lib/mcp-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IntegrationCardProps {
  tool: MarketplaceTool;
  userTierHasAccess: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => Promise<{ success: boolean; latency_ms: number }>;
}

export function IntegrationCard({
  tool,
  userTierHasAccess,
  onConnect,
  onDisconnect,
  onTest,
}: IntegrationCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency_ms: number;
  } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await onTest();
      setTestResult(result);
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult({ success: false, latency_ms: 0 });
    } finally {
      setIsTesting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "THREAT_INTEL":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "OSINT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "COMMUNICATION":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "CLOUD":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "VULNERABILITY":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "using_shared":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "not_connected":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string, shared: boolean) => {
    if (status === "connected") return "Connected";
    if (status === "using_shared" || shared) return "Using Shared";
    return "Not Connected";
  };

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Header with icon and name */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-lg dark:from-gray-800 dark:to-gray-700">
            {tool.emoji}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {tool.name}
            </h3>
            <p className="line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
              {tool.description}
            </p>
          </div>
        </div>
        {!userTierHasAccess && (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-sm dark:bg-gray-700">
            🔒
          </span>
        )}
      </div>

      {/* Category and Status badges */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge className={`text-xs ${getCategoryColor(tool.category)}`}>
          {tool.category.replace(/_/g, " ")}
        </Badge>
        <Badge className={`text-xs ${getStatusBadgeColor(tool.status)}`}>
          {getStatusLabel(tool.status, tool.shared)}
        </Badge>
      </div>

      {/* Test result feedback */}
      {testResult && (
        <div
          className={`mb-3 rounded text-xs font-medium p-2 ${
            testResult.success
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {testResult.success
            ? `✓ Connected (${testResult.latency_ms}ms)`
            : "✗ Connection failed"}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {userTierHasAccess ? (
          <>
            {tool.connected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="flex-1 text-xs"
                >
                  {isTesting ? "Testing..." : "Test"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDisconnect}
                  className="flex-1 text-xs"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onConnect}
                  className="flex-1 text-xs"
                >
                  Connect
                </Button>
              </>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="w-full text-xs opacity-50"
          >
            Upgrade to access
          </Button>
        )}
      </div>

      {/* Documentation link */}
      <a
        href={tool.docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-xs text-blue-600 hover:underline dark:text-blue-400"
      >
        View docs →
      </a>
    </div>
  );
}
