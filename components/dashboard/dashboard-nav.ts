import {
  Bell,
  Bot,
  BarChart2,
  FileText,
  Search,
  Settings,
  Shield,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "OPERATIONS",
    items: [
      { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
      { href: "/dashboard/hunting", label: "Hunting", icon: Search },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { href: "/dashboard/iocs", label: "IOCs", icon: Shield },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "PLATFORM",
    items: [
      { href: "/dashboard/agents", label: "Agents", icon: Bot },
      { href: "/dashboard/evolution", label: "Evolution", icon: TrendingUp },
      { href: "/dashboard/metrics", label: "Metrics", icon: BarChart2 },
    ],
  },
  {
    label: "SETTINGS",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

// Flat list for compatibility and lookups
export const dashboardNavItems: DashboardNavItem[] = dashboardNavGroups.flatMap(
  (group) => group.items,
);

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getDashboardTitle(pathname: string | null): string {
  if (!pathname || pathname === "/dashboard") {
    return "Command Center";
  }

  const match = dashboardNavItems.find((item) => item.href === pathname);
  if (match) {
    return match.label;
  }

  const segment =
    pathname.split("/").filter(Boolean).slice(-1)[0] || "dashboard";
  return formatSegment(segment);
}

export function getDashboardBreadcrumb(pathname: string | null): string[] {
  const crumbs = ["Dashboard"];

  if (!pathname || pathname === "/dashboard") {
    return crumbs;
  }

  const segments = pathname.split("/").filter(Boolean).slice(1);
  for (const segment of segments) {
    crumbs.push(formatSegment(segment));
  }

  return crumbs;
}
