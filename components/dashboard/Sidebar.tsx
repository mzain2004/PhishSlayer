"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CreditCard,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Link2,
  Monitor,
  ScanLine,
  Settings,
  Shield,
  Terminal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SidebarItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
};

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ScanLine, label: "Threat Scanner", href: "/dashboard/scans" },
  { icon: FlaskConical, label: "Sandbox Analysis", href: "/dashboard/sandbox" },
  { icon: Monitor, label: "Endpoint Fleet", href: "/dashboard/fleet" },
  { icon: AlertTriangle, label: "Incident Reports", href: "/dashboard/incidents" },
  { icon: Database, label: "Intel Vault", href: "/dashboard/intel" },
  { icon: Terminal, label: "AI Terminal", href: "/dashboard/terminal" },
  { icon: Shield, label: "Protocols", href: "/dashboard/protocols" },
  { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: Link2, label: "Identity Chain", href: "/dashboard/identity" },
  { icon: Activity, label: "MTTR", href: "/dashboard/mttr" },
  { icon: Boxes, label: "Admin", href: "/dashboard/admin" },
  { icon: Boxes, label: "Agent Console", href: "/dashboard/agent" },
  { icon: Boxes, label: "Agent Fleet Ops", href: "/dashboard/agents" },
  { icon: Boxes, label: "API Keys", href: "/dashboard/apikeys" },
  { icon: Boxes, label: "Audit", href: "/dashboard/audit" },
  { icon: Boxes, label: "Profile", href: "/dashboard/profile" },
  { icon: Boxes, label: "Support", href: "/dashboard/support" },
  { icon: Boxes, label: "Threat Analysis", href: "/dashboard/threats" },
];

function SidebarItem({ icon: Icon, label, href, active }: SidebarItemProps) {
  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium [transition:all_0.2s_ease] ${
          active
            ? "border-l-[3px] border-l-[#2DD4BF] bg-[rgba(45,212,191,0.15)] text-[#2DD4BF]"
            : "text-white/90 hover:bg-[rgba(255,255,255,0.07)]"
        }`}
        style={{ cursor: "pointer" }}
      >
        <Icon className="w-5 h-5 z-10" />
        <span className="z-10">{label}</span>
      </Link>
    </motion.div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState({
    fullName: "Authenticated user",
    email: "authenticated@phish-slayer.local",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      setProfile({
        fullName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : (user.email ?? "Authenticated user"),
        email: user.email ?? "authenticated@phish-slayer.local",
      });
    };

    void loadProfile();
  }, []);

  return (
    <aside
      className="fixed top-4 bottom-4 left-4 z-20 flex w-[280px] flex-col rounded-2xl border border-white/10 backdrop-blur-[12px]"
      style={{ background: "rgba(30, 20, 60, 0.85)" }}
    >
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-space-grotesk font-bold text-xl tracking-tight">
          Phish-Slayer
        </span>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={Boolean(active)}
            />
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">
              {profile.fullName}
            </span>
            <span className="text-xs text-white/50 truncate">
              {profile.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
