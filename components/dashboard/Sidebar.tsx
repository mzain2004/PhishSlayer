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
  return (
    <motion.div
      whileHover={{ x: 4, backgroundColor: "rgba(45,212,191,0.12)" }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="rounded-full"
    >
      <Link
        href={href}
        className={`flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm [transition:all_0.2s_ease] ${
          active
            ? "font-semibold text-[#2DD4BF] [background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(167,139,250,0.2))] shadow-[0_0_16px_rgba(45,212,191,0.25)]"
            : "bg-transparent text-[rgba(255,255,255,0.6)]"
        }`}
        style={{
          justifyContent: expanded ? "flex-start" : "center",
          boxShadow: active ? undefined : "none",
        }}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${
            active ? "text-[#2DD4BF]" : "text-[rgba(255,255,255,0.6)]"
          }`}
        />
        <span
          className={`ml-3 overflow-hidden whitespace-nowrap text-sm [transition:all_0.2s_ease] ${
            expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
          }`}
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
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF]">
            <Shield className="h-4 w-4 text-black" />
          </div>
          <span
            className={`font-space-grotesk overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight [transition:all_0.2s_ease] ${
              showExpanded ? "max-w-[170px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            Phish-Slayer
          </span>
        </div>

        <nav className="max-h-[100vh] flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-2">
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

        <div className="p-4 border-t border-white/10">
          <div
            className="flex items-center rounded-full px-2 py-2"
            style={{ justifyContent: showExpanded ? "flex-start" : "center" }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Profile avatar"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-black">
                {initials}
              </div>
            )}
            <div
              className={`ml-3 min-w-0 overflow-hidden whitespace-nowrap [transition:all_0.2s_ease] ${
                showExpanded ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              <span className="block truncate text-sm font-medium">
                {profile.fullName}
              </span>
              <span className="block truncate text-xs text-white/50">
                {profile.email}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
