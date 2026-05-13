"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar menu"
          className="fixed left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            color: "var(--text-primary)",
          }}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="flex-1 overflow-auto md:ml-[240px]">{children}</div>
    </div>
  );
}
