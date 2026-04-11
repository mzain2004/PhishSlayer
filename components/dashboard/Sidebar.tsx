"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Crosshair,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Link as LinkIcon,
  Menu,
  Monitor,
  ScanLine,
  Settings,
  Shield,
  Terminal,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PhishButton from "@/components/ui/PhishButton";

type SidebarItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
  badgeCount?: number;
};

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ScanLine, label: "Threat Scanner", href: "/dashboard/scans" },
  { icon: Monitor, label: "Agents & Fleet", href: "/dashboard/agents" },
  {
    icon: AlertTriangle,
    label: "Incident Reports",
    href: "/dashboard/incidents",
  },
  { icon: AlertTriangle, label: "Escalations", href: "/dashboard/escalations" },
  { icon: Crosshair, label: "Threat Hunts", href: "/dashboard/hunt" },
  { icon: Database, label: "Intel Vault", href: "/dashboard/intel" },
  { icon: LinkIcon, label: "Identity Chain", href: "/dashboard/identity" },
  { icon: Activity, label: "MTTR", href: "/dashboard/mttr" },
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
  badgeCount,
  expanded,
}: SidebarItemProps & { expanded: boolean }) {
  const baseTransition = "[transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]";

  if (!expanded) {
    return (
      <motion.div
        whileHover={{ background: "rgba(255,255,255,0.1)", scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className={`my-[1px] mx-auto flex h-10 w-10 items-center justify-center rounded-full ${baseTransition} ${
          active
            ? "[background:linear-gradient(135deg,rgba(45,212,191,0.2),rgba(167,139,250,0.15))] text-[#2DD4BF] shadow-[0_0_16px_rgba(45,212,191,0.2)]"
            : "bg-transparent text-[rgba(255,255,255,0.75)]"
        }`}
      >
        <Link
          href={href}
          className="relative flex h-10 w-10 items-center justify-center rounded-full"
        >
          <Icon className="h-[18px] w-[18px]" />
          {typeof badgeCount === "number" ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold text-black bg-[#2DD4BF] flex items-center justify-center">
              {badgeCount}
            </span>
          ) : null}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ background: "rgba(255,255,255,0.08)", x: 3 }}
      whileTap={{ scale: 0.97 }}
      className="my-[1px] rounded-full"
    >
      <Link
        href={href}
        className={`flex h-10 w-full items-center gap-[10px] rounded-full px-3 text-left ${baseTransition} ${
          active
            ? "[background:linear-gradient(135deg,rgba(45,212,191,0.2),rgba(167,139,250,0.15))] shadow-[0_0_16px_rgba(45,212,191,0.2)] text-[#2DD4BF]"
            : "bg-transparent text-[rgba(255,255,255,0.75)]"
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            active ? "text-[#2DD4BF]" : "text-[rgba(255,255,255,0.6)]"
          }`}
        />
        <span className="block overflow-hidden whitespace-nowrap text-[13px] text-[rgba(255,255,255,0.85)] font-medium [transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]">
          {label}
        </span>
        {typeof badgeCount === "number" ? (
          <span className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold text-black bg-[#2DD4BF] flex items-center justify-center">
            {badgeCount}
          </span>
        ) : null}
      </Link>
    </motion.div>
  );
}

export default function Sidebar({
  expanded,
  setExpanded,
}: {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "Authenticated user",
    email: "authenticated@phish-slayer.local",
    avatarUrl: "",
  });
  const [pendingEscalations, setPendingEscalations] = useState(0);
  const [recentHunts, setRecentHunts] = useState(0);

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

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const loadLiveBadges = async () => {
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [pendingEscalationsResult, huntsResult] = await Promise.all([
        supabase
          .from("escalations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("hunt_findings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceIso),
      ]);

      if (mounted) {
        setPendingEscalations(pendingEscalationsResult.count || 0);
        setRecentHunts(huntsResult.count || 0);
      }
    };

    void loadLiveBadges();

    const escalationsChannel = supabase
      .channel("sidebar-escalations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escalations" },
        () => {
          void loadLiveBadges();
        },
      )
      .subscribe();

    const huntsChannel = supabase
      .channel("sidebar-hunts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hunt_findings" },
        () => {
          void loadLiveBadges();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(escalationsChannel);
      void supabase.removeChannel(huntsChannel);
    };
  }, []);

  const showExpanded = mobileOpen || expanded;
  const initials = (profile.fullName?.charAt(0) || "U").toUpperCase();

  return (
    <>
      <PhishButton
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[rgba(255,255,255,0.08)] text-white backdrop-blur-[20px] md:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </PhishButton>

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`z-30 flex h-full w-full shrink-0 flex-col`}
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {showExpanded ? (
          <div className="flex h-[60px] items-center gap-3 border-b border-white/10 px-4">
            <Shield className="h-[22px] w-[22px] shrink-0 text-[#2DD4BF]" />
            <span className="font-space-grotesk overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight opacity-100 [transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]">
              Phish-Slayer
            </span>
          </div>
        ) : (
          <div className="flex h-[60px] w-16 items-center justify-center border-b border-white/10 p-0">
            <Shield className="h-[22px] w-[22px] text-[#2DD4BF]" />
          </div>
        )}

        <nav className="flex-1 px-2 py-2 overflow-hidden">
          <div className="flex flex-col">
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
                  badgeCount={
                    item.href === "/dashboard/escalations"
                      ? pendingEscalations
                      : item.href === "/dashboard/hunt"
                        ? recentHunts
                        : undefined
                  }
                />
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10">
          {showExpanded ? (
            <div className="flex items-center gap-3 px-2 py-2">
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
              <div className="min-w-0 overflow-hidden whitespace-nowrap px-2 opacity-100 [transition:all_0.25s_cubic-bezier(0.4,0,0.2,1)]">
                <span className="block truncate text-sm font-medium">
                  {profile.fullName}
                </span>
                <span className="block truncate text-xs text-white/50">
                  {profile.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex w-16 items-center justify-center py-2">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile avatar"
                  className="m-auto block h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="m-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2DD4BF] text-[13px] font-bold text-black">
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
