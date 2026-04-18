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
import PhishButton from "@/components/ui/PhishButton";
import DashboardCard from "@/components/dashboard/DashboardCard";

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
        <UpgradeBanner
          feature="Public REST API Access"
          requiredTier="SOC Pro"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full flex flex-col font-sans">
      <div className="mb-8">
        <h1 className="dashboard-page-title text-white tracking-tight flex items-center gap-3">
          <Key className="w-8 h-8 text-teal-600" />
          API Keys
        </h1>
        <p className="text-[#8B949E] mt-2 text-sm">
          Manage your programmatic access to the Phish-Slayer REST endpoints.
        </p>
      </div>

      <motion.div {...cardHover} className="mb-8 h-full">
        <DashboardCard className="overflow-hidden bg-black p-0">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <h3 className="text-lg font-semibold text-[#e6edf3]">
              Production Key
            </h3>
            {!apiKey && (
              <PhishButton
                onClick={handleGenerate}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg bg-[#2dd4bf] px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-teal-400 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Generate Key
              </PhishButton>
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
                        className="w-full pl-4 pr-12 py-3 bg-black border border-[rgba(48,54,61,0.9)] rounded-lg text-teal-400 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <PhishButton
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-slate-300"
                        title={showKey ? "Hide key" : "Show key"}
                      >
                        {showKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </PhishButton>
                    </div>
                    <PhishButton
                      onClick={handleCopy}
                      className="flex items-center justify-center rounded-lg px-4 py-3 font-semibold text-[#e6edf3] shadow-sm transition-colors liquid-glass hover:bg-[#1c2128]"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </PhishButton>
                  </div>
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded border border-amber-100 italic">
                    Warning: Do not share this key or commit it to version
                    control. It provides full access to your organization's
                    data.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <PhishButton
                    onClick={handleGenerate}
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#e6edf3] transition-colors liquid-glass hover:bg-[#1c2128] disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Regenerate Key
                  </PhishButton>
                  <PhishButton
                    onClick={handleRevoke}
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Revoke Key
                  </PhishButton>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-[#8B949E] mx-auto mb-3" />
                <h4 className="text-lg font-bold text-[#e6edf3] mb-1">
                  No API Key Configured
                </h4>
                <p className="text-sm text-[#8B949E] mb-6 max-w-sm mx-auto">
                  Generate an API key to integrate Phish-Slayer scanning
                  natively into your CI/CD pipelines or SOAR playbook.
                </p>
                <PhishButton
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2dd4bf] px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-teal-400 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Generate API Key
                </PhishButton>
              </div>
            )}
          </div>
        </DashboardCard>
      </motion.div>

      <motion.div {...cardHover} className="h-full">
        <DashboardCard className="h-full text-slate-300 md:p-8">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Terminal className="w-5 h-5 text-teal-400" /> Usage Examples
          </h3>
          <p className="mb-6 text-sm">
            Use your API key as a Bearer token in the{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-white">
              Authorization
            </code>{" "}
            header.
          </p>

          <div className="space-y-4">
            <div>
              <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-teal-400">
                cURL Example
              </span>
              <code className="block whitespace-pre overflow-x-auto rounded-lg border border-[rgba(48,54,61,0.9)] bg-[#0f172a] p-4 font-mono text-sm text-emerald-300">
                curl -X POST https://api.phish-slayer.com/v1/scans \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                &nbsp;&nbsp;-d '&#123;"target":"suspicious-url.com"&#125;'
              </code>
            </div>
          </div>
        </DashboardCard>
      </motion.div>
    </div>
  );
}
