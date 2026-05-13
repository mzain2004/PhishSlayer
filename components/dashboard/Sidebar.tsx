"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNavGroups } from "@/components/dashboard/dashboard-nav";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className="flex h-16 items-center gap-3 px-5"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden"
          style={{ background: "var(--accent-dim)" }}
        >
          <Image
            src="/logo.png"
            alt="PhishSlayer"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            SOC PLATFORM
          </p>
          <p
            className="truncate text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            PhishSlayer
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <div className="flex flex-col gap-6 px-2">
          {dashboardNavGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <h3
                className="px-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {group.label}
              </h3>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150"
                      style={
                        isActive
                          ? {
                              color: "var(--text-primary)",
                              background: "var(--accent-dim)",
                              borderLeft: "2px solid var(--accent)",
                            }
                          : {
                              color: "var(--text-secondary)",
                              borderLeft: "2px solid transparent",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.color =
                            "var(--text-primary)";
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--bg-elevated)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.color =
                            "var(--text-secondary)";
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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

      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[240px] backdrop-blur md:flex md:flex-col"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--bg-border)",
        }}
      >
        <SidebarContent />
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col shadow-2xl transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--bg-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)" }}
          >
            Navigation
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md"
            style={{
              border: "1px solid var(--bg-border)",
              color: "var(--text-secondary)",
            }}
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
