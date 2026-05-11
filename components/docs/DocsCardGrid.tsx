"use client";

import Link from "next/link";
import { Shield, Bell, Search, Cpu, Plug, FileText, CreditCard, Code2, Lock, Zap } from "lucide-react";

const CARDS = [
  { icon: Zap, label: "Getting Started", desc: "Install, configure, and connect your first integration in minutes.", href: "/docs/getting-started", color: "#7C5CFF" },
  { icon: Bell, label: "Alerts & Triage", desc: "Understand severity levels, the alert lifecycle, and L1/L2/L3 AI agents.", href: "/docs/alerts", color: "#EF4444" },
  { icon: Search, label: "Threat Hunting", desc: "Run proactive hunts with the L3 agent against your endpoint telemetry.", href: "/docs/hunting", color: "#F97316" },
  { icon: Shield, label: "IOC Management", desc: "Add, import, and enrich indicators of compromise from threat feeds.", href: "/docs/iocs", color: "#10B981" },
  { icon: Cpu, label: "Agent Setup", desc: "Deploy the Wazuh EDR sensor on Windows and Linux endpoints.", href: "/docs/agents", color: "#60A5FA" },
  { icon: Plug, label: "Integrations", desc: "Connect Microsoft 365, Slack, PagerDuty, and MCP tools.", href: "/docs/integrations", color: "#A855F7" },
  { icon: FileText, label: "Reports", desc: "Generate PDF reports, schedule delivery, and customize templates.", href: "/docs/reports", color: "#EAB308" },
  { icon: CreditCard, label: "Billing & Pricing", desc: "Compare plans, upgrade, downgrade, or cancel your subscription.", href: "/docs/billing", color: "#10B981" },
  { icon: Code2, label: "API Reference", desc: "REST API authentication, rate limits, endpoints, and examples.", href: "/docs/api", color: "#7C5CFF" },
  { icon: Lock, label: "Security & Compliance", desc: "Encryption, data handling, GDPR, SOC 2, and access control.", href: "/docs/security", color: "#EF4444" },
];

export default function DocsCardGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 48 }}>
      {CARDS.map(({ icon: Icon, label, desc, href, color }) => (
        <Link
          key={href}
          href={href}
          className="docs-card"
          style={{ display: "block", textDecoration: "none", background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 10, padding: "20px" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon size={18} style={{ color }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.55" }}>{desc}</div>
        </Link>
      ))}
    </div>
  );
}
