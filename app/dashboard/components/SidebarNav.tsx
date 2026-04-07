"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard as ShieldIcon,
  Search,
  AlertTriangle,
  Globe,
  Database,
  Monitor,
  Settings2,
  Settings,
  CreditCard,
  Users,
  Key,
  FileText,
  LifeBuoy,
  ChevronDown,
  Link as LinkIcon,
  Activity,
} from "lucide-react";
import { type UserRole } from "@/lib/rbac/roles";
import { motion } from "framer-motion";
import PhishButton from "@/components/ui/PhishButton";

type SidebarNavProps = {
  profile: {
    display_name: string | null;
    role: UserRole;
    avatar_url: string | null;
    email: string;
  } | null;
};

export default function SidebarNav({ profile }: SidebarNavProps) {
  const pathname = usePathname();
  const [infraOpen, setInfraOpen] = useState(true);
  const [platformOpen, setPlatformOpen] = useState(true);

  const isCurrentPath = (path: string) => pathname === path;

  const NavItem = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: any;
    label: string;
  }) => {
    const isActive = isCurrentPath(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-sm ${
          isActive
            ? "font-semibold bg-teal-400/10 text-teal-400 border-l-2 border-teal-400"
            : "text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[rgba(23,28,35,0.85)]"
        }`}
      >
        <Icon className="w-6 h-6 flex-shrink-0" />
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap overflow-hidden">
          {label}
        </span>
      </Link>
    );
  };

  const roleBadgeStyles: Record<UserRole, string> = {
    super_admin: "bg-red-500/10 text-red-400 border border-red-500/20",
    manager: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    analyst: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
    viewer: "bg-white/10 text-[#8B949E] border border-[rgba(48,54,61,0.9)]",
  };

  const getInitials = () => {
    if (profile?.display_name)
      return profile.display_name.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    return "?";
  };

  return (
    <aside className="w-20 hover:w-64 transition-[width] duration-300 ease-in-out group fixed left-0 top-0 h-full bg-black border-r border-white/10 flex flex-col z-50 overflow-hidden">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 overflow-hidden">
        <div className="w-7 h-7 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-teal-500/30">
          <Shield className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <span className="text-[#e6edf3] font-bold text-sm tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap">
          Phish-Slayer
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 py-2 mt-2">
          <span className="text-xs uppercase tracking-widest text-[#8B949E] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap overflow-hidden block">
            MONITORING
          </span>
        </div>
        <div>
          <>
            <NavItem
              href="/dashboard"
              icon={ShieldIcon}
              label="Command Center"
            />
            <NavItem
              href="/dashboard/scans"
              icon={Search}
              label="Threat Scanner"
            />
            <NavItem
              href="/dashboard/threats"
              icon={Globe}
              label="Threat Intel"
            />
            <NavItem
              href="/dashboard/intel"
              icon={Database}
              label="Intel Vault"
            />
          </>
        </div>

        <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
          type="button"
          onClick={() => setInfraOpen((prev) => !prev)}
          className="text-xs uppercase tracking-widest text-[#8B949E] hover:text-[#E6EDF3] cursor-pointer flex items-center justify-between w-full py-2 px-3 mt-4"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap overflow-hidden">
            INFRASTRUCTURE
          </span>
          <ChevronDown
            className={`transition-transform duration-200 ${!infraOpen ? "rotate-180" : ""} opacity-0 group-hover:opacity-100`}
            size={16}
          />
        </PhishButton>
        {infraOpen && (
          <>
            <NavItem
              href="/dashboard/agent"
              icon={Monitor}
              label="Endpoint Monitor"
            />
            <NavItem
              href="/dashboard/agents"
              icon={Settings2}
              label="Agent Fleet"
            />
            <NavItem
              href="/dashboard/identity"
              icon={LinkIcon}
              label="Identity Chain"
            />
            <NavItem
              href="/dashboard/mttr"
              icon={Activity}
              label="MTTR Timeline"
            />
          </>
        )}

        <PhishButton transition={{ type: "spring", stiffness: 400, damping: 17 }}
          type="button"
          onClick={() => setPlatformOpen((prev) => !prev)}
          className="text-xs uppercase tracking-widest text-[#8B949E] hover:text-[#E6EDF3] cursor-pointer flex items-center justify-between w-full py-2 px-3 mt-4"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap overflow-hidden">
            PLATFORM
          </span>
          <ChevronDown
            className={`transition-transform duration-200 ${!platformOpen ? "rotate-180" : ""} opacity-0 group-hover:opacity-100`}
            size={16}
          />
        </PhishButton>
        {platformOpen && (
          <>
            <NavItem
              href="/dashboard/settings"
              icon={Settings}
              label="Settings"
            />
            <NavItem
              href="/dashboard/billing"
              icon={CreditCard}
              label="Billing"
            />
            <NavItem href="/dashboard/admin" icon={Users} label="Team" />
            <NavItem href="/dashboard/apikeys" icon={Key} label="API Keys" />
            <NavItem
              href="/dashboard/audit"
              icon={FileText}
              label="Audit Log"
            />
          </>
        )}

        <div className="px-3 py-2 mt-4">
          <span className="text-xs uppercase tracking-widest text-[#8B949E] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap overflow-hidden block">
            RESPONSE
          </span>
        </div>
        <NavItem
          href="/dashboard/incidents"
          icon={AlertTriangle}
          label="Incidents"
        />

        <div className="mt-8 border-t border-white/10 pt-2">
          <NavItem href="/dashboard/support" icon={LifeBuoy} label="Support" />
        </div>
      </nav>

      {/* User Profile Area */}
      <div className="bg-black border-t border-white/10 px-3 py-3 overflow-hidden">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(23,28,35,0.85)] transition-colors group/profile"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-[rgba(48,54,61,0.9)] flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-teal-400">
                {getInitials()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <p className="text-sm font-medium text-[#e6edf3] truncate">
              {profile?.display_name || profile?.email.split("@")[0] || "User"}
            </p>
            {profile?.role && (
              <span
                className={`text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full ${roleBadgeStyles[profile.role]}`}
              >
                {profile.role.replace("_", " ")}
              </span>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}