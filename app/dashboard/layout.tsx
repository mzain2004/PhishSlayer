"use client";

import { DashboardErrorBoundary } from "./components/ErrorBoundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
    </div>
  );
}
