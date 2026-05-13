"use client";

import React, { useState } from "react";
import { MarketplaceTool } from "@/lib/mcp-tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface ConnectModalProps {
  tool: MarketplaceTool | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConnectModal({
  tool,
  isOpen,
  onClose,
  onSuccess,
}: ConnectModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tool || !isOpen) return null;

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_id: tool.id,
          api_key: apiKey,
          config: Object.keys(config).length > 0 ? config : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to connect: ${response.status}`,
        );
      }

      setApiKey("");
      setConfig({});
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tool.emoji}</span>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Connect {tool.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {tool.description}
        </p>

        <div className="space-y-4">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              API Key
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your API key is encrypted and never logged. It&apos;s only used to
              connect to {tool.name}.
            </p>
            <a
              href={tool.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Get API key from {tool.name} →
            </a>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                }}
                placeholder="Paste your API key"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Config Fields */}
          {tool.configFields && tool.configFields.length > 0 && (
            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Additional Configuration
              </p>
              {tool.configFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                  </label>
                  <Input
                    type={field.type || "text"}
                    value={config[field.key] || ""}
                    onChange={(e) =>
                      handleConfigChange(field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    disabled={isLoading}
                    className="text-sm"
                  />
                  {field.helperText && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {field.helperText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isLoading || !apiKey.trim()}
              className="flex-1"
            >
              {isLoading ? "Connecting..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
