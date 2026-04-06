"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FlaskConical,
  Laptop,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Terminal,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DashboardShellProps = {
  children: React.ReactNode;
};

type SessionProfile = {
  email: string;
  fullName: string;
  avatarUrl: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const glassCard =
  "bg-[rgba(22,27,34,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Endpoint Fleet", href: "/dashboard/agents", icon: Laptop },
  { label: "Sandbox Analysis", href: "/dashboard/scans", icon: FlaskConical },
  { label: "AI Terminal", href: "/dashboard/agent", icon: Terminal },
  { label: "Protocols", href: "/dashboard/incidents", icon: ShieldAlert },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function displayInitials(nameOrEmail: string) {
  const chunks = nameOrEmail.trim().split(/\s+/);
  if (chunks.length >= 2) {
    return `${chunks[0][0] ?? ""}${chunks[1][0] ?? ""}`.toUpperCase();
  }
  return (chunks[0]?.slice(0, 2) ?? "US").toUpperCase();
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<SessionProfile>({
    email: "Authenticated user",
    fullName: "Authenticated user",
    avatarUrl: "",
  });

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const fullName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : (user.email ?? "Authenticated user");
      const avatarUrl =
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : "";

      setProfile({
        email: user.email ?? "Authenticated user",
        fullName,
        avatarUrl,
      });
    };

    void loadUser();
  }, []);

  const sectionTitle = useMemo(() => {
    if (!pathname || pathname === "/dashboard") {
      return "Command Center";
    }

    const tail = pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .join(" ")
      .replace(/-/g, " ");

    return tail.replace(/\b\w/g, (c) => c.toUpperCase()) || "Dashboard";
  }, [pathname]);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#A78BFA] opacity-20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#2DD4BF] opacity-20 blur-[150px]" />
      </div>

      <aside
        className={`fixed top-4 bottom-4 left-4 w-[280px] ${glassCard} flex flex-col z-20`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-xl tracking-tight">Phish-Slayer</span>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 w-full text-left overflow-hidden ${
                  isActive
                    ? "bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20"
                    : "text-white/70 hover:text-white hover:bg-[rgba(22,27,34,0.85)]"
                }`}
              >
                <item.icon className="w-5 h-5 z-10" />
                <span className="z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(22,27,34,0.85)] transition-colors">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 border border-[rgba(48,54,61,0.9)] flex items-center justify-center text-xs font-semibold">
                {displayInitials(profile.fullName || profile.email)}
              </div>
            )}
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

      <div className="flex-1 ml-[300px] flex flex-col min-h-screen z-10 p-4">
        <header
          className={`w-full h-16 ${glassCard} flex items-center justify-between px-6 mb-6 relative z-50`}
        >
          <div className="text-sm font-medium text-white/70">
            Dashboard <span className="text-white/30 mx-2">/</span>{" "}
            <span className="text-white">{sectionTitle}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/50 border border-[rgba(48,54,61,0.9)] rounded-full pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#2DD4BF]/50 transition-colors w-64"
              />
            </div>

            <button className="rounded-full relative text-white/70 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#2DD4BF] rounded-full" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-400">
                System Status: Optimal
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

