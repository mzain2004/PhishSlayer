"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const TITLES: Record<string, string> = {
  "/docs": "Introduction",
  "/docs/getting-started": "Getting Started",
  "/docs/alerts": "Alerts & Triage",
  "/docs/hunting": "Threat Hunting",
  "/docs/iocs": "IOC Management",
  "/docs/agents": "Agent Setup",
  "/docs/integrations": "Integrations",
  "/docs/billing": "Billing & Pricing",
  "/docs/api": "API Reference",
  "/docs/reports": "Reports",
  "/docs/security": "Security & Compliance",
};

export default function DocsBreadcrumb() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "";
  if (!title) return null;

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
      <Link href="/docs" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Docs</Link>
      {pathname !== "/docs" && (
        <>
          <ChevronRight size={12} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ color: "var(--text-secondary)" }}>{title}</span>
        </>
      )}
    </nav>
  );
}
