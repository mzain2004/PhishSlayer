"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  getDashboardBreadcrumb,
  getDashboardTitle,
} from "@/components/dashboard/dashboard-nav";
import { DashboardErrorBoundary } from "./ErrorBoundary";
import { usePathname, useRouter } from "next/navigation";
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

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({
    name: "Authenticated User",
    email: "user@phishslayer.tech",
    avatarUrl: "",
  });

  // Sync profile and check onboarding status
  useEffect(() => {
    if (!userLoaded || !clerkUser) return;
    
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "user@phishslayer.tech";
    const name = clerkUser.fullName || clerkUser.firstName || email;
    const avatarUrl = clerkUser.imageUrl || "";
    setProfile({ name, email, avatarUrl });

    // Check organization setup status
    const checkSetup = async () => {
        try {
            const res = await fetch("/api/organizations");
            const orgs = await res.json();
            const currentOrgId = clerkUser.publicMetadata.organizationId;
            const currentOrg = orgs.find((o: any) => o.id === currentOrgId);
            
            if (currentOrg && currentOrg.setup_complete === false && pathname !== '/dashboard/onboarding') {
                router.push('/dashboard/onboarding');
            }
        } catch (err) {
            console.error("Failed to check org setup", err);
        }
    };
    
    if (clerkUser.publicMetadata.organizationId) {
        checkSetup();
    }
  }, [clerkUser, userLoaded, pathname, router]);

  const handleUserChange = useCallback((_userId: string | null) => {
    // Profile is now managed via useUser() above; no action needed here
  }, []);

  const loadingFallback = (
    <div
      className="dashboard-theme relative flex h-screen flex-row overflow-hidden text-white"
      style={{
        background:
          "var(--bg-primary)",
      }}
    />
  );

  return (
    <SessionGuard
      loadingFallback={loadingFallback}
      onUserChange={handleUserChange}
    >
      <a href="#main" className="sr-only focus:not-sr-only fixed top-4 left-4 z-[100] text-white px-4 py-2 rounded-lg font-bold" style={{ background: 'var(--accent)' }}>
        Skip to main content
      </a>
      <div
        className="dashboard-theme relative min-h-screen overflow-hidden text-white"
        style={{
          background:
            "var(--bg-primary)",
        }}
      >
        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col md:pl-[240px]">
          <header className="sticky top-0 z-20 border-b px-4 py-4 backdrop-blur md:px-6" style={{ borderColor: 'var(--bg-border)', background: 'rgba(18,21,28,0.85)' }}>
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
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    {getDashboardBreadcrumb(pathname).join(" / ")}
                  </p>
                  <h1 className="dashboard-page-title" style={{ color: 'var(--text-primary)' }}>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold" style={{ border: '1px solid var(--bg-border)', background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {initialsFromProfile(profile)}
                  </div>
                )}
              </div>
            </div>
          </header>

          <main id="main" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <DashboardErrorBoundary>
              <div className="grid gap-6 p-6">{children}</div>
            </DashboardErrorBoundary>
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
