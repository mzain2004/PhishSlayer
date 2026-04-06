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
  Terminal,
} from "lucide-react";
import { ROLE_COLORS, ROLE_LABELS, type UserRole } from "@/lib/rbac/roles";

type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
};

import SidebarNav from "./components/SidebarNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();

  const sectionTitle =
    pathname === "/dashboard"
      ? "Command Center"
      : pathname
          .split("/")
          .filter(Boolean)
          .slice(1)
          .join(" ")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()) || "Dashboard";

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

  return (
    <div className="flex min-h-screen bg-black">
      <SidebarNav profile={profile} />

      <main className="relative ml-20 min-h-screen flex-1 overflow-y-auto bg-black">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur sm:px-8">
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white sm:text-base">{sectionTitle}</h1>
          </div>
          <div className="text-xs text-[#8B949E] sm:text-sm">
            {profile?.display_name || profile?.email || "Authenticated user"}
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
        </div>
      </main>
    </div>
  );
}

