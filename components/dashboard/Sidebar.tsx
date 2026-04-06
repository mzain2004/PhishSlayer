"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Menu,
  Monitor,
  ScanLine,
  Settings,
  Shield,
  Terminal,
  X,
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
  { icon: Monitor, label: "Endpoint Fleet", href: "/dashboard/fleet" },
  {
    icon: AlertTriangle,
    label: "Incident Reports",
    href: "/dashboard/incidents",
  },
  { icon: Database, label: "Intel Vault", href: "/dashboard/intel" },
  { icon: Terminal, label: "AI Terminal", href: "/dashboard/terminal" },
  { icon: FileText, label: "Reports", href: "/dashboard/reports" },
  { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

function SidebarItem({
  icon: Icon,
  label,
  href,
  active,
  expanded,
}: SidebarItemProps & { expanded: boolean }) {
  const baseTransition = "[transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]";

  if (!expanded) {
    return (
      <div className="my-[2px] flex h-11 w-16 items-center justify-center p-0">
        <Link
          href={href}
          className={`flex h-11 w-11 items-center justify-center ${baseTransition} ${
            active
              ? "rounded-lg bg-[rgba(45,212,191,0.2)] text-[#2DD4BF]"
              : "rounded-lg text-[rgba(255,255,255,0.65)]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} className="my-[2px]">
      <Link
        href={href}
        className={`flex h-11 w-full items-center gap-3 rounded-full px-4 text-left text-sm ${baseTransition} ${
          active
            ? "font-semibold text-[#2DD4BF] [background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(167,139,250,0.2))] shadow-[0_0_16px_rgba(45,212,191,0.25)]"
            : "bg-transparent text-[rgba(255,255,255,0.6)]"
        }`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${
            active ? "text-[#2DD4BF]" : "text-[rgba(255,255,255,0.6)]"
          }`}
        />
        <span
          className="overflow-hidden whitespace-nowrap text-sm opacity-100 [transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]"
        >
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "Authenticated user",
    email: "authenticated@phish-slayer.local",
    avatarUrl: "",
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

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      setProfile({
        fullName:
          typeof profileRow?.full_name === "string"
            ? profileRow.full_name
            : typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : (user.email ?? "Authenticated user"),
        email: user.email ?? "authenticated@phish-slayer.local",
        avatarUrl:
          typeof profileRow?.avatar_url === "string"
            ? profileRow.avatar_url
            : "",
      });
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const showExpanded = mobileOpen || expanded;
  const initials = (profile.fullName?.charAt(0) || "U").toUpperCase();

  return (
    <>
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-[rgba(30,20,60,0.85)] text-white backdrop-blur-[12px] md:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`z-30 flex h-screen shrink-0 flex-col border-r border-white/10 backdrop-blur-[12px] [transition:width_0.25s_cubic-bezier(0.4,0,0.2,1)] md:relative ${mobileOpen ? "fixed inset-y-0 left-0 w-64" : "fixed inset-y-0 left-0 w-0 md:w-16"} ${expanded ? "md:w-64" : "md:w-16"}`}
        style={{ background: "rgba(30, 20, 60, 0.85)", overflow: "hidden" }}
      >
        {showExpanded ? (
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
            <Shield className="h-6 w-6 shrink-0 text-[#2DD4BF]" />
            <span className="font-space-grotesk overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight opacity-100 [transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]">
              Phish-Slayer
            </span>
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center border-b border-white/10 p-0">
            <Shield className="h-6 w-6 text-[#2DD4BF]" />
          </div>
        )}

        <nav className={`max-h-[100vh] flex-1 overflow-y-auto ${showExpanded ? "px-2 py-2" : "p-0"}`}>
          <div className={`flex flex-col ${showExpanded ? "gap-1" : "gap-0"}`}>
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
                  expanded={showExpanded}
                />
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10">
          {showExpanded ? (
            <div className="flex items-center gap-3 px-4 py-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile avatar"
                  className="block h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2DD4BF] text-[13px] font-bold text-black">
                  {initials}
                </div>
              )}
              <div className="min-w-0 overflow-hidden whitespace-nowrap opacity-100 [transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]">
                <span className="block truncate text-sm font-medium">
                  {profile.fullName}
                </span>
                <span className="block truncate text-xs text-white/50">
                  {profile.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex w-16 items-center justify-center py-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile avatar"
                  className="m-auto block h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2DD4BF] text-[13px] font-bold text-black">
                  {initials}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
