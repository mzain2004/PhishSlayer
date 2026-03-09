"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 text-blue-600">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="text-slate-900 text-lg font-bold tracking-tight">
              Phish-Slayer
            </h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 w-full flex flex-col">
          {navigation.map((item) => {
            const isActive = isCurrentPath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? "bg-teal-50 text-teal-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors shrink-0 ${
                    isActive
                      ? "text-teal-600"
                      : "text-slate-400 group-hover:text-teal-600"
                  }`}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Configuration
            </p>
          </div>

          {configNavigation.map((item) => {
            const isActive = isCurrentPath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? "bg-teal-50 text-teal-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors shrink-0 ${
                    isActive
                      ? "text-teal-600"
                      : "text-slate-400 group-hover:text-teal-600"
                  }`}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0 flex flex-col gap-2">
          <Link
            href="/dashboard/support"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
              isCurrentPath("/dashboard/support")
                ? "bg-teal-50 text-teal-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <HelpCircle
              className={`w-5 h-5 transition-colors shrink-0 ${
                isCurrentPath("/dashboard/support")
                  ? "text-teal-600"
                  : "text-slate-400 group-hover:text-teal-600"
              }`}
            />
            <span className="text-sm font-medium">Support</span>
          </Link>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200 mt-2 hover:bg-teal-50 hover:border-teal-200 cursor-pointer transition-colors group"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              {profile?.avatar_url ? (
                <div
                  className="w-9 h-9 rounded-full bg-cover bg-center border border-slate-200"
                  style={{ backgroundImage: `url('${profile.avatar_url}')` }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials()}
                </div>
              )}
              {profile && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
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

      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-[#fafafa] p-4 md:p-8 [&>div>aside]:hidden [&>div]:w-full">
        {children}
      </main>
    </div>
  );
}
