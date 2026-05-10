"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
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

      <div className="flex-1 overflow-auto md:ml-[240px]">{children}</div>
    </div>
  );
}
