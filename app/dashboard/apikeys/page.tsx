"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Key,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Terminal,
  Loader2,
} from "lucide-react";
import {
  getUser,
  generateApiKey,
  revokeApiKey,
} from "@/lib/supabase/auth-actions";
import { useTier } from "@/hooks/useTier";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { limits, isSuperAdmin, loading: tierLoading } = useTier();

  const fetchKey = async () => {
    const user = await getUser();
    setApiKey(user?.apiKey || null);
    setLoaded(true);
  };

  useEffect(() => {
    fetchKey();
  }, []);

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success("API Key copied to clipboard.");
    }
  };

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateApiKey();
      if (result.error) toast.error(result.error);
      else {
        toast.success("New API key generated.");
        setApiKey(result.key || null);
      }
    });
  };

  const handleRevoke = () => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? Integrations using it will break instantly.",
      )
    )
      return;

    startTransition(async () => {
      const result = await revokeApiKey();
      if (result.error) toast.error(result.error);
      else {
        toast.success("API key revoked.");
        setApiKey(null);
      }
    });
  };

  const cardHover = {
    whileHover: {
      scale: 1.02,
      boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
    },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  };

  if (!loaded || tierLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );

  if (!limits.canUsePublicAPI && !isSuperAdmin) {
    return (
      <div className="text-white font-sans min-h-screen pt-20">
        <UpgradeBanner feature="Public REST API Access" requiredTier="SOC Pro" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Key className="w-8 h-8 text-teal-600" />
          API Keys
        </h1>
        <p className="text-[#8B949E] mt-2 text-sm">
          Manage your programmatic access to the Phish-Slayer REST endpoints.
        </p>
      </div>

      <motion.div {...cardHover} className="bg-black rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden mb-8">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#e6edf3]">
            Production Key
          </h3>
          {!apiKey && (
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-[#2dd4bf] hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Generate Key
            </button>
          )}
        </div>

        <div className="p-6 md:p-8">
          {apiKey ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#e6edf3]">
                  Your API Secret Key
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      readOnly
                      className="w-full pl-4 pr-12 py-3 bg-black border border-white/10 rounded-lg text-teal-400 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-slate-300"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-3 liquid-glass hover:bg-[#1c2128] text-[#e6edf3] font-semibold rounded-lg shadow-sm transition-colors flex justify-center items-center"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded border border-amber-100 italic">
                  Warning: Do not share this key or commit it to version
                  control. It provides full access to your organization's data.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-[#e6edf3] liquid-glass hover:bg-[#1c2128] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate Key
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Revoke Key
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-[#8B949E] mx-auto mb-3" />
              <h4 className="text-lg font-bold text-[#e6edf3] mb-1">
                No API Key Configured
              </h4>
              <p className="text-sm text-[#8B949E] mb-6 max-w-sm mx-auto">
                Generate an API key to integrate Phish-Slayer scanning natively
                into your CI/CD pipelines or SOAR playbook.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2dd4bf] hover:bg-teal-400 text-black font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Generate API Key
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div {...cardHover} className="bg-white/5 rounded-xl shadow-sm border border-white/10 overflow-hidden text-slate-300 p-6 md:p-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-400" /> Usage Examples
        </h3>
        <p className="text-sm mb-6">
          Use your API key as a Bearer token in the{" "}
          <code className="bg-white/10 px-1 py-0.5 rounded text-white">
            Authorization
          </code>{" "}
          header.
        </p>

        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2 inline-block">
              cURL Example
            </span>
            <code className="block bg-[#0f172a] p-4 rounded-lg font-mono text-sm border border-white/10 whitespace-pre overflow-x-auto text-emerald-300">
              curl -X POST https://api.phish-slayer.com/v1/scans \<br />
              &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
              &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
              &nbsp;&nbsp;-d '&#123;"target":"suspicious-url.com"&#125;'
            </code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

