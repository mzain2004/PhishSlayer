"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText } from "lucide-react";

const INDEX = [
  { title: "Introduction", href: "/docs", desc: "Platform overview, architecture, key concepts" },
  { title: "Getting Started", href: "/docs/getting-started", desc: "Installation, environment setup, first login, quick start" },
  { title: "Alerts & Triage", href: "/docs/alerts", desc: "Severity levels, alert lifecycle, L1 L2 L3 AI agents, bulk operations" },
  { title: "Threat Hunting", href: "/docs/hunting", desc: "Hunt hypotheses, L3 agent, running hunts, MITRE ATT&CK" },
  { title: "IOC Management", href: "/docs/iocs", desc: "IP domains hashes, bulk CSV import, threat feeds, enrichment" },
  { title: "Agent Setup", href: "/docs/agents", desc: "Wazuh EDR agent, Windows Linux deployment, configuration, troubleshooting" },
  { title: "Integrations", href: "/docs/integrations", desc: "Microsoft 365, Slack, PagerDuty, MCP tools, API keys, webhooks" },
  { title: "Reports", href: "/docs/reports", desc: "PDF reports, executive summary, scheduling, email delivery" },
  { title: "Billing & Pricing", href: "/docs/billing", desc: "Free SOC Pro Command Center Enterprise plans, upgrade downgrade, cancellation" },
  { title: "API Reference", href: "/docs/api", desc: "REST API, authentication, rate limits, endpoints, pagination" },
  { title: "Security & Compliance", href: "/docs/security", desc: "Encryption, GDPR, SOC 2, data residency, access control" },
];

export default function DocsSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? INDEX.filter((item) => {
        const q = query.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      })
    : [];

  const handleSelect = useCallback((href: string) => {
    router.push(href);
    setQuery("");
    setOpen(false);
    setFocused(-1);
  }, [router]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && e.target === document.body) { e.preventDefault(); inputRef.current?.focus(); }
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
      if (e.key === "Enter" && focused >= 0 && results[focused]) handleSelect(results[focused].href);
      if (e.key === "Escape") { setOpen(false); setFocused(-1); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, focused, results, handleSelect]);

  useEffect(() => {
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setFocused(-1); } };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  useEffect(() => {
    if (query.trim()) { setOpen(true); setFocused(-1); } else setOpen(false);
  }, [query]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 8, padding: "6px 12px" }}>
        <Search size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search docs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 14, width: "100%", fontFamily: "var(--font-body)" }}
        />
        <kbd style={{ fontSize: 11, color: "var(--text-tertiary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>/</kbd>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200, overflow: "hidden" }}>
          {results.length > 0 ? results.map((r, i) => (
            <button
              key={r.href}
              onClick={() => handleSelect(r.href)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left", padding: "10px 16px", background: i === focused ? "var(--bg-hover)" : "transparent", border: "none", borderBottom: "1px solid var(--bg-border)", cursor: "pointer" }}
            >
              <FileText size={14} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{r.desc}</div>
              </div>
            </button>
          )) : (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-tertiary)" }}>No results for &ldquo;{query}&rdquo;</div>
          )}
        </div>
      )}
    </div>
  );
}
