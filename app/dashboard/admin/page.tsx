"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  ShieldAlert,
  Loader2,
  Lock,
  UserPlus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { useRole } from "@/lib/rbac/useRole";
import { ROLE_COLORS, ROLE_LABELS, type UserRole } from "@/lib/rbac/roles";
import {
  getOrgUsers,
  updateUserRole,
  toggleUserStatus,
  inviteOrgUser,
} from "@/lib/supabase/actions";

type OrgUser = {
  id: string;
  display_name: string;
  email?: string;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  last_active: string | null;
  avatar_url?: string | null;
};

export default function UserManagementPage() {
  const { role, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("analyst");

  const refreshUsers = async () => {
    try {
      const res = (await getOrgUsers()) as { users?: any[]; error?: string };
      if (res.error) {
        toast.error(res.error);
      }
      if (res.users) {
        setUsers(res.users as OrgUser[]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    if (role === "super_admin") {
      refreshUsers();
    } else if (role) {
      setLoaded(true);
    }
  }, [role]);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Role updated successfully");
        await refreshUsers();
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleUserStatus(userId, !currentStatus);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          `User ${!currentStatus ? "activated" : "deactivated"} successfully`,
        );
        await refreshUsers();
      }
    });
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    startTransition(async () => {
      const res = await inviteOrgUser(inviteEmail, inviteRole);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setShowModal(false);
        setInviteEmail("");
        setInviteRole("analyst");
        await refreshUsers();
      }
    });
  };

  if (roleLoading || (!loaded && role === "super_admin")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-[#8B949E] max-w-sm">
          You do not have permission to view the User Management page. This area
          is restricted to Super Administrators.
        </p>
      </div>
    );
  }

  const activeAnalysts = users.filter(
    (u) => u.role === "analyst" && u.is_active,
  ).length;
  const managers = users.filter(
    (u) => u.role === "manager" && u.is_active,
  ).length;
  const viewers = users.filter(
    (u) => u.role === "viewer" && u.is_active,
  ).length;

  const DARK_ROLE_COLORS: Record<UserRole, string> = {
    super_admin: "bg-red-500/10 text-red-400 border-red-500/20",
    manager: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    analyst: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    viewer: "bg-slate-500/10 text-[#8B949E] border-slate-500/20",
  };

  const cardHover = {
    whileHover: {
      scale: 1.02,
      boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
    },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  };

  return (
    <div className="text-white font-sans min-h-screen flex flex-col w-full">
      <main className="flex-1 px-4 sm:px-8 py-8 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Users className="w-7 h-7 text-teal-400" />
              User Management
            </h1>
            <p className="text-[#8B949E] mt-2 text-sm">
              Manage organization members, assign roles, and control access.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div {...cardHover} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-[#8B949E]">Total Users</p>
            <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
          </motion.div>
          <motion.div {...cardHover} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-[#8B949E]">
              Active Analysts
            </p>
            <p className="text-3xl font-bold text-teal-400 mt-1">
              {activeAnalysts}
            </p>
          </motion.div>
          <motion.div {...cardHover} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-[#8B949E]">Managers</p>
            <p className="text-3xl font-bold text-indigo-400 mt-1">
              {managers}
            </p>
          </motion.div>
          <motion.div {...cardHover} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-sm font-medium text-[#8B949E]">Exec Viewers</p>
            <p className="text-3xl font-bold text-slate-300 mt-1">{viewers}</p>
          </motion.div>
        </div>

        {/* Users Table */}
        <motion.div {...cardHover} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8B949E] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-white/10 transition-colors ${!u.is_active ? "opacity-60 grayscale" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                          {u.avatar_url ? (
                            <div
                              className="w-full h-full rounded-full bg-cover bg-center"
                              style={{
                                backgroundImage: `url('${u.avatar_url}')`,
                              }}
                            />
                          ) : (
                            <span className="font-bold text-[#8B949E] text-sm">
                              {u.display_name
                                ? u.display_name.charAt(0).toUpperCase()
                                : "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {u.display_name || "Unknown"}
                          </p>
                          <p className="text-xs text-[#8B949E]">
                            {u.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as UserRole)
                        }
                        disabled={isPending}
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md outline-none cursor-pointer border appearance-none pr-6 bg-transparent ${DARK_ROLE_COLORS[u.role]}`}
                        style={{
                          backgroundPosition: "right 0.25rem center",
                          backgroundSize: "1em",
                          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        }}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="manager">SOC Manager</option>
                        <option value="analyst">SOC Analyst</option>
                        <option value="viewer">Executive Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">
                        {u.department || "â€”"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B949E] bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#8B949E]">
                        {u.last_active
                          ? new Date(u.last_active).toLocaleDateString()
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        disabled={isPending}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                          u.is_active
                            ? "bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "bg-transparent border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white/5 rounded-2xl border border-white/10 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                Invite New User
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8B949E] hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#8B949E] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#8B949E] mb-1">
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500 transition-all appearance-none outline-none"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="manager">SOC Manager</option>
                  <option value="analyst">SOC Analyst</option>
                  <option value="viewer">Executive Viewer</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-[#8B949E] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={isPending || !inviteEmail}
                className="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

