"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/components/dashboard/dashboard-nav";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm uppercase tracking-widest text-gray-400">
            SOC
          </p>
          <p className="truncate text-sm font-semibold text-white">
            Phish Slayer
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <div className="flex flex-col gap-1 px-2">
          {dashboardNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-r-lg border-l-2 px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "border-l-primary bg-primary/15 text-white"
                    : "border-l-transparent text-gray-300 hover:border-l-accent hover:bg-accent/15 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          aria-label="Close sidebar overlay"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-white/10 bg-base/95 backdrop-blur md:flex md:flex-col">
        <SidebarContent />
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-white/10 bg-base shadow-2xl transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="text-xs uppercase tracking-widest text-gray-400">
            Navigation
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-200"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent onNavigate={onCloseMobile} />
      </aside>
    </>
  );
}
