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
    <div className="flex min-h-screen bg-[#0d1117]">
      <SidebarNav profile={profile} />

      <main className="flex-1 ml-64 min-h-screen bg-[#0d1117] overflow-y-auto relative">
        <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
      </main>
    </div>
  );
}
