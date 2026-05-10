"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Key, Loader2, X, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Tool = {
  name: string;
  label: string;
  category: string;
  needs_key: boolean;
  using_custom_key: boolean;
  using_phishslayer_key: boolean;
};

const TOOL_META: Record<string, { emoji: string; desc: string }> = {
  virustotal:    { emoji: "🦠", desc: "Malware & URL reputation scanning" },
  shodan:        { emoji: "🔭", desc: "Internet-connected device search" },
  abuseipdb:    { emoji: "🚫", desc: "IP abuse confidence scoring" },
  urlscan:       { emoji: "🔗", desc: "URL/domain sandbox analysis" },
  greynoise:     { emoji: "📡", desc: "Internet background noise filtering" },
  hibp:          { emoji: "🔓", desc: "Have I Been Pwned breach data" },
  hunter:        { emoji: "📧", desc: "Email address reconnaissance" },
  otx:           { emoji: "👽", desc: "AlienVault Open Threat Exchange" },
  censys:        { emoji: "🌐", desc: "Internet-wide host/cert scanning" },
  misp:          { emoji: "🔄", desc: "Malware Information Sharing Platform" },
  opencti:       { emoji: "🧠", desc: "Structured threat intelligence platform" },
  crtsh:         { emoji: "📜", desc: "Certificate transparency log search" },
  urlhaus:       { emoji: "🕷️", desc: "Malicious URL database" },
  threatfox:     { emoji: "🦊", desc: "IOC sharing by Abuse.ch" },
  malwarebazaar: { emoji: "🗄️", desc: "Malware sample repository" },
  passivedns:    { emoji: "🗂️", desc: "Historical DNS resolution data" },
  whois:         { emoji: "📋", desc: "Domain registration lookup" },
};

const SECTION_MAP: Record<string, string> = {
  "Threat Intel":   "OSINT & THREAT INTEL",
  "Reputation":     "OSINT & THREAT INTEL",
  "URL Analysis":   "OSINT & THREAT INTEL",
  "Noise Intel":    "OSINT & THREAT INTEL",
  "Breach Intel":   "OSINT & THREAT INTEL",
  "Email Intel":    "OSINT & THREAT INTEL",
  "Malware":        "OSINT & THREAT INTEL",
  "Recon":          "SECURITY PLATFORMS",
  "Cert Trans.":    "SECURITY PLATFORMS",
  "Threat Sharing": "SECURITY PLATFORMS",
};

const SECTION_ORDER = ["OSINT & THREAT INTEL", "SECURITY PLATFORMS"];

function StatusBadge({ tool }: { tool: Tool }) {
  if (!tool.needs_key) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
        FREE
      </span>
    );
  }
  if (tool.using_custom_key) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
        CONNECTED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
      PS KEY
    </span>
  );
}

export default function IntegrationsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ tool: Tool } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  async function fetchTools() {
    setLoading(true);
    try {
      const r = await fetch("/api/settings/integrations");
      const json = await r.json();
      setTools(json.data?.tools ?? []);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTools(); }, []);

  async function saveKey() {
    if (!modal || !apiKeyInput.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_name: modal.tool.name, api_key: apiKeyInput.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message ?? "Save failed");
      toast.success(`${modal.tool.label} key saved`);
      setModal(null);
      setApiKeyInput("");
      setShowKey(false);
      fetchTools();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function removeKey(tool: Tool) {
    setRemoving(tool.name);
    try {
      const r = await fetch(`/api/settings/integrations?tool=${tool.name}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Remove failed");
      toast.success(`${tool.label} reverted to PhishSlayer default`);
      fetchTools();
    } catch {
      toast.error("Failed to remove key");
    } finally {
      setRemoving(null);
    }
  }

  const bySection = SECTION_ORDER.reduce<Record<string, Tool[]>>((acc, sec) => {
    const sectionTools = tools.filter((t) => (SECTION_MAP[t.category] ?? "OSINT & THREAT INTEL") === sec);
    if (sectionTools.length) acc[sec] = sectionTools;
    return acc;
  }, {});

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tool Integrations</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          All tools work out of the box with PhishSlayer&apos;s shared keys. Add your own key to use your own quota.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
          Loading integrations…
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(bySection).map(([section, sectionTools]) => (
            <div key={section}>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--text-tertiary)' }}>
                {section}
              </h2>
              <div className="flex flex-col gap-2">
                {sectionTools.map((tool) => {
                  const meta = TOOL_META[tool.name] ?? { emoji: "🔧", desc: tool.category };
                  return (
                    <div key={tool.name}
                      className="flex items-center justify-between p-4 rounded-lg transition-colors"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--bg-border)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span style={{ fontSize: 22 }}>{meta.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{tool.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{meta.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <StatusBadge tool={tool} />
                        {tool.needs_key && (
                          tool.using_custom_key ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => { setModal({ tool }); setApiKeyInput(""); setShowKey(false); }}
                                className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                                style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', background: 'transparent' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)'; }}
                              >
                                Rotate key
                              </button>
                              <button
                                onClick={() => removeKey(tool)}
                                disabled={removing === tool.name}
                                className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                                style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
                              >
                                {removing === tool.name ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setModal({ tool }); setApiKeyInput(""); setShowKey(false); }}
                              className="text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5"
                              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                            >
                              <Key className="h-3 w-3" />
                              Add key
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key entry modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-lg p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20 }}>{TOOL_META[modal.tool.name]?.emoji ?? '🔧'}</span>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{modal.tool.label}</h2>
              </div>
              <button
                onClick={() => { setModal(null); setApiKeyInput(""); setShowKey(false); }}
                style={{ color: 'var(--text-tertiary)' }}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Paste your {modal.tool.label} API key. It will be encrypted before storage and never displayed again.
            </p>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="API key…"
                className="w-full rounded-md px-3 py-2 pr-10 text-sm font-mono"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--bg-border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveKey(); }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent-border)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bg-border)')}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setModal(null); setApiKeyInput(""); setShowKey(false); }}
                className="text-sm font-medium px-4 py-2 rounded-md transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={saveKey}
                disabled={!apiKeyInput.trim() || saving}
                className="text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#FFFFFF' }}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" />Save Key</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
