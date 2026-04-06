"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/rbac/useRole";
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  Calendar,
  User,
  Activity,
} from "lucide-react";

export default function AuditLogPage() {
  const { role, loading: roleLoading } = useRole();
  const supabase = createClient();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "super_admin" && role !== "manager") {
      setLoading(false);
      return;
    }
    fetchLogs();

    // 10 second timeout fallback
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) setFetchError("Request timed out. Please refresh the page.");
        return false;
      });
    }, 10000);
    return () => clearTimeout(timeout);
  }, [roleLoading, role, page, actionFilter, searchTerm]);

  const fetchLogs = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let query = supabase.from("audit_log").select("*", { count: "exact" });

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (searchTerm) {
        query = query.or(
          `user_email.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%,resource_id.ilike.%${searchTerm}%`,
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        console.error("Audit log fetch error:", error);
        setFetchError(error.message);
      } else {
        setLogs(data || []);
        if (count !== null) setTotalCount(count);
      }
    } catch (err: any) {
      console.error("Audit log fetch exception:", err);
      setFetchError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (role !== "super_admin" && role !== "manager") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Access Denied</h2>
          <p className="text-[#8B949E] max-w-sm">
            You do not have the required permissions to view the system audit
            logs.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Pretty format actions
  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col min-h-screen bg-black">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-teal-400" />
            Audit Log
          </h1>
          <p className="text-[#8B949E] mt-2 text-sm">
            Comprehensive compliance and activity tracking across all platform
            actions.
          </p>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col flex-1">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Search user, action, or resource..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-lg text-sm text-white bg-white/5 focus:ring-2 focus:ring-teal-500 placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 border border-white/10 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-teal-500 bg-white/5 appearance-none"
              >
                <option value="all">All Actions</option>
                <option value="login">Login</option>
                <option value="scan_launched">Scan Launched</option>
                <option value="incident_created">Incident Created</option>
                <option value="incident_resolved">Incident Resolved</option>
                <option value="ip_blocked">IP Blocked</option>
                <option value="user_role_changed">Role Changed</option>
                <option value="profile_updated">Profile Updated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 h-[500px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-[#8B949E] sticky top-0 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold tracking-widest uppercase text-[10px]">
                  Timestamp / IP
                </th>
                <th className="px-6 py-4 font-bold tracking-widest uppercase text-[10px]">
                  Actor
                </th>
                <th className="px-6 py-4 font-bold tracking-widest uppercase text-[10px]">
                  Action
                </th>
                <th className="px-6 py-4 font-bold tracking-widest uppercase text-[10px]">
                  Resource / Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-[#8B949E]"
                  >
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading audit trails...
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-red-500"
                  >
                    <Shield className="w-8 h-8 mx-auto mb-2 text-red-300" />
                    <p className="font-semibold">Failed to load audit logs</p>
                    <p className="text-sm text-[#8B949E] mt-1">{fetchError}</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-[#8B949E]"
                  >
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">
                      No audit events recorded yet
                    </p>
                    <p className="text-sm mt-1">
                      Events will appear here as users perform actions in the
                      dashboard.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/10 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-slate-300">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.ip_address && (
                          <span className="text-xs text-[#8B949E] font-mono">
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-[10px] font-bold">
                          {log.user_email
                            ? log.user_email.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">
                            {log.user_email || "System"}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#8B949E]">
                            {log.user_role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono tracking-tight bg-white/10 text-teal-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">
                          {log.resource_type
                            ? `${log.resource_type}: ${log.resource_id}`
                            : "Platform"}
                        </span>
                        {log.details && (
                          <span
                            className="text-xs text-[#8B949E] max-w-xs truncate"
                            title={JSON.stringify(log.details)}
                          >
                            {JSON.stringify(log.details).substring(0, 50)}
                            {JSON.stringify(log.details).length > 50
                              ? "..."
                              : ""}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <p className="text-sm text-[#8B949E]">
            Showing{" "}
            <span className="font-semibold text-white">
              {(page - 1) * pageSize + (logs.length > 0 ? 1 : 0)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {(page - 1) * pageSize + logs.length}
            </span>{" "}
            of <span className="font-semibold text-white">{totalCount}</span>{" "}
            entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded border border-white/10 hover:bg-white/10 disabled:opacity-50 text-[#8B949E]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium px-4 py-1.5 bg-white/10 border border-white/10 rounded text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded border border-white/10 hover:bg-white/10 disabled:opacity-50 text-[#8B949E]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

