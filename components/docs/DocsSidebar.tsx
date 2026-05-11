"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    title: "Overview",
    items: [
      { label: "Introduction", href: "/docs" },
      { label: "Getting Started", href: "/docs/getting-started" },
    ],
  },
  {
    title: "Core Features",
    items: [
      { label: "Alerts & Triage", href: "/docs/alerts" },
      { label: "Threat Hunting", href: "/docs/hunting" },
      { label: "IOC Management", href: "/docs/iocs" },
    ],
  },
  {
    title: "Deployment",
    items: [
      { label: "Agent Setup", href: "/docs/agents" },
      { label: "Integrations", href: "/docs/integrations" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Reports", href: "/docs/reports" },
      { label: "Billing & Pricing", href: "/docs/billing" },
      { label: "API Reference", href: "/docs/api" },
      { label: "Security & Compliance", href: "/docs/security" },
    ],
  },
];

export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav style={{ padding: "24px 12px" }}>
      {NAV.map((section) => (
        <div key={section.title} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", marginBottom: 6, padding: "0 8px" }}>
            {section.title}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/docs" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    style={{
                      display: "block",
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: 14,
                      textDecoration: "none",
                      color: isActive ? "var(--accent)" : "var(--text-secondary)",
                      background: isActive ? "var(--accent-dim)" : "transparent",
                      fontWeight: isActive ? 500 : 400,
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
