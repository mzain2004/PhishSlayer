import {
  Activity,
  AlertTriangle,
  Bot,
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Radar,
  Search,
  Settings,
  Shield,
  Terminal,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/dashboard/threats", label: "Threat Scanner", icon: Radar },
  { href: "/dashboard/scans", label: "Scan History", icon: Search },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/escalations", label: "Escalations", icon: Shield },
  { href: "/dashboard/hunt", label: "Threat Hunt", icon: Activity },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/terminal", label: "AI Terminal", icon: Terminal },
  { href: "/dashboard/identity", label: "Identity", icon: Users },
  { href: "/dashboard/intel", label: "Intel Vault", icon: FileText },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/apikeys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

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
