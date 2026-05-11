"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Shield, ExternalLink } from "lucide-react";
import DocsSidebar from "@/components/docs/DocsSidebar";
import DocsTOC from "@/components/docs/DocsTOC";
import DocsSearch from "@/components/docs/DocsSearch";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header style={{ height: 56, position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid var(--bg-border)", background: "rgba(8,13,18,0.96)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", padding: "0 20px", gap: 16 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu" className="md:hidden" style={{ color: "var(--text-secondary)", padding: 4, background: "none", border: "none", cursor: "pointer", display: "flex" }}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>PhishSlayer</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "2px 6px", border: "1px solid var(--bg-border)", borderRadius: 4 }}>docs</span>
        </Link>

        <div style={{ flex: 1, maxWidth: 480 }}>
          <DocsSearch />
        </div>

        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          <span className="hidden sm:inline">Open App</span>
          <ExternalLink size={12} />
        </Link>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.65)" }} onClick={() => setSidebarOpen(false)}>
          <aside style={{ width: 280, height: "100%", background: "var(--bg-primary)", borderRight: "1px solid var(--bg-border)", overflowY: "auto", paddingTop: 56 }} onClick={(e) => e.stopPropagation()}>
            <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Body */}
      <div style={{ display: "flex", maxWidth: 1440, margin: "0 auto" }}>
        {/* Left sidebar */}
        <aside className="hidden md:block" style={{ width: 256, flexShrink: 0, position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", borderRight: "1px solid var(--bg-border)" }}>
          <DocsSidebar />
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0, padding: "36px 48px 80px", maxWidth: 800 }}>
          <DocsBreadcrumb />
          {children}
        </main>

        {/* Right TOC */}
        <aside className="hidden xl:block" style={{ width: 232, flexShrink: 0, position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", borderLeft: "1px solid var(--bg-border)" }}>
          <DocsTOC />
        </aside>
      </div>
    </div>
  );
}
