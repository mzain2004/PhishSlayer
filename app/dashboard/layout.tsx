"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardErrorBoundary } from "./components/ErrorBoundary";
import {
  ShieldAlert,
  LayoutDashboard,
  Radar,
  Shield,
  FileText,
  Database,
  Settings,
  User,
  CreditCard,
  HelpCircle,
  Activity,
  Users as UsersIcon,
  ClipboardList,
  Key,
} from "lucide-react";
import { ROLE_COLORS, ROLE_LABELS, type UserRole } from "@/lib/rbac/roles";

type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: profData, error } = await supabase
        .from("profiles")
        .select("id, role, display_name, avatar_url")
        .eq("id", authData.user.id)
        .single();

      if (error) {
        console.error("Sidebar profile fetch error:", error);
        setProfile({
          id: authData.user.id,
          email: authData.user.email || "",
          role: "analyst",
          display_name: null,
          avatar_url: null,
        });
      } else if (profData) {
        setProfile({
          id: authData.user.id,
          email: authData.user.email || "",
          role: (profData.role as UserRole) || "analyst",
          display_name: profData.display_name,
          avatar_url: profData.avatar_url,
        });
      }
    };
    fetchProfile();

    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  const role = profile?.role;
  const isSuperAdmin = role === "super_admin";
  const isManagerOrAdmin = role === "super_admin" || role === "manager";
  const isViewerOrAnalyst = role === "viewer" || role === "analyst";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Scan Manager", href: "/dashboard/scans", icon: Radar },
    { name: "Threat Intel", href: "/dashboard/threats", icon: Shield },
    { name: "Agent Monitor", href: "/dashboard/agent", icon: Activity },
    { name: "Incident Reports", href: "/dashboard/incidents", icon: FileText },
    // Hide Intel Vault for analysts
    ...(role !== "analyst"
      ? [{ name: "Intel Vault", href: "/dashboard/intel", icon: Database }]
      : []),
  ];

  const configNavigation = [
    // Hide Platform Settings for viewers and analysts
    ...(!isViewerOrAnalyst
      ? [
          {
            name: "Platform Settings",
            href: "/dashboard/settings",
            icon: Settings,
          },
        ]
      : []),
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
    // Add User Management for super admins only
    ...(isSuperAdmin
      ? [{ name: "User Management", href: "/dashboard/admin", icon: UsersIcon }]
      : []),
    ...(isManagerOrAdmin
      ? [{ name: "Audit Log", href: "/dashboard/audit", icon: ClipboardList }]
      : []),
    ...(role !== "viewer"
      ? [{ name: "API Keys", href: "/dashboard/apikeys", icon: Key }]
      : []),
  ];

  const isCurrentPath = (path: string) => pathname === path;

  const getInitials = () => {
    if (profile?.display_name)
      return profile.display_name.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    return "?";
  };

  const displayName =
    profile?.display_name ||
    (profile?.email ? profile.email.split("@")[0] : "User");
  const truncatedName =
    displayName.length > 20
      ? displayName.substring(0, 20) + "..."
      : displayName;

  return (
    <div className="min-h-screen bg-transparent text-white font-sans">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#080d1a]/40 backdrop-blur-3xl border-r border-white/10 flex flex-col z-40 overflow-y-auto shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/50 shrink-0">
          <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-white font-bold text-lg">Phish-Slayer</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 w-full flex flex-col">
          {navigation.map((item) => {
            const isActive = isCurrentPath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center gap-3 px-3 py-2.5 rounded-lg text-teal-400 text-sm font-medium bg-teal-500/10 border-l-2 border-teal-400 transition-all duration-150"
                    : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 text-sm font-medium hover:text-white hover:bg-slate-800/50 transition-all duration-150 group"
                }
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive
                      ? "text-teal-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 pb-2 px-3">
            <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest mt-2">
              Configuration
            </p>
          </div>

          {configNavigation.map((item) => {
            const isActive = isCurrentPath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center gap-3 px-3 py-2.5 rounded-lg text-teal-400 text-sm font-medium bg-teal-500/10 border-l-2 border-teal-400 transition-all duration-150"
                    : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 text-sm font-medium hover:text-white hover:bg-slate-800/50 transition-all duration-150 group"
                }
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive
                      ? "text-teal-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800/50 shrink-0 flex flex-col gap-2">
          <Link
            href="/dashboard/support"
            className={
              isCurrentPath("/dashboard/support")
                ? "flex items-center gap-3 px-3 py-2.5 rounded-lg text-teal-400 text-sm font-medium bg-teal-500/10 border-l-2 border-teal-400 transition-all duration-150"
                : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 text-sm font-medium hover:text-white hover:bg-slate-800/50 transition-all duration-150 group"
            }
          >
            <HelpCircle
              className={`w-5 h-5 shrink-0 transition-colors ${
                isCurrentPath("/dashboard/support")
                  ? "text-teal-400"
                  : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
            <span>Support</span>
          </Link>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors cursor-pointer mt-2"
          >
            <div className="relative shrink-0 flex items-center justify-center w-9 h-9">
              {profile?.avatar_url ? (
                <div
                  className="w-full h-full rounded-full bg-cover bg-center border border-slate-700"
                  style={{ backgroundImage: `url('${profile.avatar_url}')` }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-sm">
                  {getInitials()}
                </div>
              )}
              {profile && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#090e1a] rounded-full"></span>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm font-medium text-white truncate transition-colors">
                {truncatedName}
              </p>
              {profile?.role ? (
                <p
                  className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 inline-flex w-max rounded border ${ROLE_COLORS[profile.role]}`}
                >
                  {ROLE_LABELS[profile.role]}
                </p>
              ) : (
                <p className="text-xs text-slate-500 font-medium truncate">
                  Loading...
                </p>
              )}
            </div>
          </Link>
        </div>
      </aside>

      <main className="ml-64 min-h-screen bg-transparent overflow-y-auto p-4 md:p-8 [&>div>aside]:hidden [&>div]:w-full relative">
        <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
      </main>
    </div>
  );
}
