'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Shield, 
  LayoutDashboard as ShieldIcon, 
  Search, 
  AlertTriangle, 
  Globe, 
  Database, 
  Monitor, 
  Cpu, 
  Settings, 
  CreditCard, 
  Users, 
  Key, 
  FileText, 
  LifeBuoy 
} from 'lucide-react';
import { type UserRole } from '@/lib/rbac/roles';

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

  const isCurrentPath = (path: string) => pathname === path;

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = isCurrentPath(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all duration-150 ${
          isActive
            ? 'text-[#e6edf3] bg-[#1c2128] border border-[#30363d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]'
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-400' : ''}`} />
        {label}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <span className="px-3 py-2 text-[10px] font-semibold tracking-widest uppercase text-[#6e7681] block mt-4">
      {label}
    </span>
  );

  const roleBadgeStyles: Record<UserRole, string> = {
    super_admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
    manager: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    analyst: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    viewer: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  };

  const getInitials = () => {
    if (profile?.display_name) return profile.display_name.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <aside className="w-64 fixed left-0 top-0 h-full bg-[#161b22] border-r border-[#30363d] flex flex-col z-50">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#30363d]">
        <div className="w-7 h-7 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-teal-500/30">
          <Shield className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <span className="text-[#e6edf3] font-semibold text-sm tracking-tight">
          Phish-Slayer
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <SectionLabel label="OPERATIONS" />
        <NavItem href="/dashboard" icon={ShieldIcon} label="Command Center" />
        <NavItem href="/dashboard/scans" icon={Search} label="Threat Scanner" />
        <NavItem href="/dashboard/incidents" icon={AlertTriangle} label="Incidents" />
        <NavItem href="/dashboard/threats" icon={Globe} label="Threat Intel" />
        <NavItem href="/dashboard/intel" icon={Database} label="Intel Vault" />

        <SectionLabel label="INFRASTRUCTURE" />
        <NavItem href="/dashboard/agent" icon={Monitor} label="Endpoint Monitor" />
        <NavItem href="/dashboard/agents" icon={Cpu} label="Agent Fleet" />

        <SectionLabel label="PLATFORM" />
        <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
        <NavItem href="/dashboard/billing" icon={CreditCard} label="Billing" />
        <NavItem href="/dashboard/admin" icon={Users} label="Team" />
        <NavItem href="/dashboard/apikeys" icon={Key} label="API Keys" />
        <NavItem href="/dashboard/audit" icon={FileText} label="Audit Log" />

        <div className="mt-8 border-t border-[#30363d]/50 pt-2">
          <NavItem href="/dashboard/support" icon={LifeBuoy} label="Support" />
        </div>
      </nav>

      {/* User Profile Area */}
      <div className="bg-[#1c2128] border-t border-[#30363d] px-3 py-3">
        <Link 
          href="/dashboard/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#21262d] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#30363d] flex items-center justify-center overflow-hidden border border-[#30363d] flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-teal-400">{getInitials()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#e6edf3] truncate">
              {profile?.display_name || profile?.email.split('@')[0] || 'User'}
            </p>
            {profile?.role && (
              <span className={`text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-md ${roleBadgeStyles[profile.role]}`}>
                {profile.role.replace('_', ' ')}
              </span>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}
