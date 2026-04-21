"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  getDashboardBreadcrumb,
  getDashboardTitle,
} from "@/components/dashboard/dashboard-nav";
import { DashboardErrorBoundary } from "./components/ErrorBoundary";
import { usePathname } from "next/navigation";
import SessionGuard from "@/components/auth/SessionGuard";
import { useUser } from "@clerk/nextjs";

type ProfileState = {
  name: string;
  email: string;
  avatarUrl: string;
};

function initialsFromProfile(profile: ProfileState) {
  const source = profile.name || profile.email || "User";
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<ProfileState>({
    name: "Authenticated User",
    email: "user@phishslayer.tech",
    avatarUrl: "",
  });

  // Sync profile from Clerk user data
  useEffect(() => {
    if (!clerkUser) return;
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "user@phishslayer.tech";
    const name = clerkUser.fullName || clerkUser.firstName || email;
    const avatarUrl = clerkUser.imageUrl || "";
    setProfile({ name, email, avatarUrl });
  }, [clerkUser]);

  const handleUserChange = useCallback((_userId: string | null) => {
    // Profile is now managed via useUser() above; no action needed here
  }, []);

  const loadingFallback = (
    <div
      className="dashboard-theme relative flex h-screen flex-row overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg,#0f0c29 0%,#1a1a3e 30%,#0d2b2b 70%,#0D1117 100%)",
      }}
    />
  );

  return (
    <SessionGuard
      loadingFallback={loadingFallback}
      onUserChange={handleUserChange}
    >
      <div
        className="dashboard-theme relative min-h-screen overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(135deg,#0f0c29 0%,#1a1a3e 30%,#0d2b2b 70%,#0D1117 100%)",
        }}
      >
        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col md:pl-[240px]">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1016]/80 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white md:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    {getDashboardBreadcrumb(pathname).join(" / ")}
                  </p>
                  <h1 className="dashboard-page-title text-white">
                    {getDashboardTitle(pathname)}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-10 w-10 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white">
                    {initialsFromProfile(profile)}
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <DashboardErrorBoundary>
              <div className="grid gap-6 p-6">{children}</div>
            </DashboardErrorBoundary>
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
