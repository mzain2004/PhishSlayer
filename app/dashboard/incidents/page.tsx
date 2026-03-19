"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  Shield,
  ChevronRight,
  Download,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  FileWarning,
  Search,
  Filter,
  Users,
  Plus,
  X,
} from "lucide-react";
import {
  assignIncident,
  createIncident,
  getIncidents,
  getOrgUsers,
  resolveIncident,
  deleteIncident,
  blockIp,
} from "@/lib/supabase/actions";
import { useRole } from "@/lib/rbac/useRole";
import { canAssignIncidents, isReadOnly } from "@/lib/rbac/roles";

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  assignee: string;
  assigned_to?: string;
  description?: string;
  risk_score?: number;
  threat_category?: string;
  remediation_steps?: string[];
  created_at?: string;
  lastUpdated?: string;
};

type OrgUser = {
  id: string;
  display_name: string;
  role: string;
};

function severityBadge(severity: string) {
  const s = severity?.toLowerCase() || "medium";
  if (s === "critical") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (s === "high")
    return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (s === "low") return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() || "";
  if (s.includes("resolved"))
    return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-teal-500/10 text-teal-400 border-teal-500/20";
}

export default function IncidentReportsPage() {
  const { role, loading: roleLoading } = useRole();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "7" | "30">(
    "all",
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    severity: "Medium",
    description: "",
    assignee: "Unassigned",
  });

  useEffect(() => {
    Promise.all([
      getIncidents(),
      // Fetch users only if manager/admin, but we don't know the exact guarantee here on the client on mount
      // We will try catching gracefully if unauthorized
      getOrgUsers().catch(() => ({ users: [] })),
    ])
      .then(([incData, usersData]) => {
        setIncidents(incData as Incident[]);
        const u = (usersData as { users?: any[] }).users || [];
        setOrgUsers(u as OrgUser[]);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoaded(true));
  }, []);

  const refreshData = async () => {
    try {
      const data = await getIncidents();
      setIncidents(data as Incident[]);
    } catch {}
  };

  const handleResolve = (id: string) => {
    setActionId(id);
    setActionType("resolve");
    startTransition(async () => {
      try {
        await resolveIncident(id, "Resolved via dashboard.");
        toast.success("Incident resolved.");
        await refreshData();
      } catch (err: any) {
        toast.error(err.message || "Failed to resolve incident.");
      } finally {
        setActionId(null);
        setActionType(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    setActionId(id);
    setActionType("delete");
    startTransition(async () => {
      try {
        await deleteIncident(id);
        toast.success("Incident deleted.");
        await refreshData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete incident.");
      } finally {
        setActionId(null);
        setActionType(null);
      }
    });
  };

  const handleAssign = (incidentId: string, userId: string) => {
    const user = orgUsers.find((u) => u.id === userId);
    if (!user) return;
    setActionId(incidentId);
    setActionType("assign");
    startTransition(async () => {
      try {
        const res = await assignIncident(incidentId, userId);
        if (res.error) throw new Error(res.error);
        toast.success(`Assigned to ${user.display_name}.`);
        await refreshData();
      } catch (err: any) {
        toast.error(err.message || "Failed to assign incident.");
      } finally {
        setActionId(null);
        setActionType(null);
      }
    });
  };

  const extractTarget = (incident: Incident): string | null => {
    const combined = `${incident.title || ""} ${incident.description || ""}`;
    const ipMatch = combined.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) return ipMatch[1];
    const domainMatch = combined.match(
      /Target:\s*([a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    );
    if (domainMatch) return domainMatch[1];
    return null;
  };

  const handleBlockIp = (target: string, incidentId: string) => {
    setActionId(incidentId);
    setActionType("block");
    startTransition(async () => {
      try {
        await blockIp(target);
        toast.success(`Target ${target} blocked and added to Intel Vault.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to block target.");
      } finally {
        setActionId(null);
        setActionType(null);
      }
    });
  };
  
  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.title) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createIncident(newIncident);
        if (res.error) throw new Error(res.error);
        toast.success("Incident created successfully.");
        setIsCreateModalOpen(false);
        setNewIncident({
          title: "",
          severity: "Medium",
          description: "",
          assignee: "Unassigned",
        });
        await refreshData();
      } catch (err: any) {
        toast.error(err.message || "Failed to create incident.");
      }
    });
  };

  const isActioning = (id: string, type: string) =>
    isPending && actionId === id && actionType === type;

  const exportToExcel = async () => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Phish-Slayer";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Incidents");

    sheet.columns = [
      { header: "Title", key: "title", width: 40 },
      { header: "Severity", key: "severity", width: 12 },
      { header: "Status", key: "status", width: 22 },
      { header: "Assignee", key: "assignee", width: 16 },
      { header: "Risk Score", key: "risk_score", width: 12 },
      { header: "Threat Category", key: "threat_category", width: 20 },
      { header: "Created At", key: "created_at", width: 22 },
    ];

    sheet.getRow(1).eachCell((cell: import("exceljs").Cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D9488" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    incidents.forEach((i) => {
      const assignedUserName = orgUsers.find(
        (u) => u.id === i.assigned_to,
      )?.display_name;
      sheet.addRow({
        title: i.title,
        severity: i.severity,
        status: i.status,
        assignee: assignedUserName || i.assignee || "Unassigned",
        risk_score: i.risk_score ?? "N/A",
        threat_category: i.threat_category || "N/A",
        created_at: i.created_at
          ? new Date(i.created_at).toLocaleString()
          : "N/A",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PhishSlayer_Incidents_Export.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Incidents exported to Excel.");
  };

  const filtered = useMemo(() => {
    let result = incidents;

    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.severity?.toLowerCase().includes(q) ||
          i.status?.toLowerCase().includes(q) ||
          i.assignee?.toLowerCase().includes(q) ||
          i.threat_category?.toLowerCase().includes(q),
      );
    }

    if (dateRange !== "all") {
      const now = new Date();
      result = result.filter((i) => {
        if (!i.created_at) return false;
        const d = new Date(i.created_at);
        const diffMs = now.getTime() - d.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (dateRange === "today") return diffDays <= 1;
        if (dateRange === "7") return diffDays <= 7;
        if (dateRange === "30") return diffDays <= 30;
        return true;
      });
    }

    return result;
  }, [incidents, filter, dateRange]);

  if (!loaded || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const isViewOnly = role && isReadOnly(role);
  const canAssign = role && canAssignIncidents(role);

  return (
    <div className="bg-[#0a0f1e] text-slate-100 font-sans min-h-screen flex flex-col w-full">
      <main className="flex-1 px-4 sm:px-8 py-8 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <a
              className="hover:text-teal-600 transition-colors"
              href="/dashboard"
            >
              Dashboard
            </a>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-white font-medium">Incident Reports</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Incident Reports
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                {incidents.length} incident{incidents.length !== 1 ? "s" : ""}{" "}
                on record
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1 h-[42px]">
                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                <select
                  value={dateRange}
                  onChange={(e: any) => setDateRange(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-300 py-1.5 pr-8 focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                </select>
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter incidents…"
                  className="w-56 py-2.5 pl-10 pr-4 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 transition-colors shadow-lg shadow-teal-900/20"
              >
                <Plus className="w-4 h-4" />
                New Incident
              </button>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="flex flex-col gap-1 rounded-xl bg-[#0f1629] p-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Incidents
              </p>
              <Shield className="text-teal-600 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {incidents.length}
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[#0f1629] p-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Open</p>
              <AlertTriangle className="text-orange-500 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {
                incidents.filter(
                  (i) => !i.status?.toLowerCase().includes("resolved"),
                ).length
              }
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[#0f1629] p-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Resolved</p>
              <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {
                incidents.filter((i) =>
                  i.status?.toLowerCase().includes("resolved"),
                ).length
              }
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[#0f1629] p-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Critical</p>
              <AlertTriangle className="text-red-500 w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {
                incidents.filter(
                  (i) => i.severity?.toLowerCase() === "critical",
                ).length
              }
            </p>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-[#0f1629] border border-slate-800 p-16 text-center">
            <FileWarning className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">
              No incidents found
            </h3>
            <p className="text-sm text-slate-500">
              {filter || dateRange !== "all"
                ? "Try adjusting your search filters."
                : "Incidents created from scans will appear here."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-[#0f1629] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Assignee
                    </th>
                    {!isViewOnly && (
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((incident) => {
                    const assignedUser = orgUsers.find(
                      (u) => u.id === incident.assigned_to,
                    );

                    return (
                      <tr
                        key={incident.id}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-white truncate max-w-[260px]">
                            {incident.title}
                          </p>
                          {incident.threat_category && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">
                              {incident.threat_category}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${severityBadge(
                              incident.severity,
                            )}`}
                          >
                            {incident.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge(
                              incident.status,
                            )}`}
                          >
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          {canAssign ? (
                            <div className="flex items-center gap-2">
                              {isActioning(incident.id, "assign") ? (
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                              ) : (
                                <Users className="w-4 h-4 text-slate-400" />
                              )}
                              <select
                                value={incident.assigned_to || ""}
                                onChange={(e) =>
                                  handleAssign(incident.id, e.target.value)
                                }
                                disabled={isPending && actionId === incident.id}
                                className="bg-slate-900 border border-slate-700 text-sm text-slate-300 py-1.5 px-3 rounded-md focus:ring-1 focus:ring-teal-500 outline-none w-40 truncate"
                              >
                                <option value="" disabled>
                                  Unassigned
                                </option>
                                {orgUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.display_name} ({u.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 font-medium">
                              {assignedUser?.display_name ||
                                incident.assignee ||
                                "Unassigned"}
                            </p>
                          )}
                        </td>
                        {!isViewOnly && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Resolve */}
                              {!incident.status
                                ?.toLowerCase()
                                .includes("resolved") && (
                                <button
                                  onClick={() => handleResolve(incident.id)}
                                  disabled={
                                    isPending && actionId === incident.id
                                  }
                                  title="Resolve"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                >
                                  {isActioning(incident.id, "resolve") ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  Resolve
                                </button>
                              )}

                              {/* Block IP/Domain */}
                              {extractTarget(incident) && (
                                <button
                                  onClick={() => {
                                    const target = extractTarget(incident);
                                    if (target)
                                      handleBlockIp(target, incident.id);
                                  }}
                                  disabled={
                                    isPending && actionId === incident.id
                                  }
                                  title="Block IP"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                                >
                                  {isActioning(incident.id, "block") ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Ban className="w-3.5 h-3.5" />
                                  )}
                                  Block IP
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(incident.id)}
                                disabled={isPending && actionId === incident.id}
                                title="Delete"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                {isActioning(incident.id, "delete") ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Incident Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#0f1629] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Create New Incident</h2>
              <p className="text-slate-400 text-sm mb-6">Manually log a threat or security investigation.</p>

              <form onSubmit={handleCreateIncident} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 pl-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newIncident.title}
                    onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all"
                    placeholder="e.g. Unusual login from Russia"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5 pl-1">
                      Severity
                    </label>
                    <select
                      value={newIncident.severity}
                      onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5 pl-1">
                      Initial Assignee
                    </label>
                    <select
                      value={newIncident.assignee}
                      onChange={(e) => setNewIncident({ ...newIncident, assignee: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {orgUsers.map(u => (
                        <option key={u.id} value={u.display_name}>{u.display_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 pl-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all resize-none"
                    placeholder="Describe the threat or suspicious activity observed..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-700 font-semibold text-slate-300 hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-6 py-3 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-500 transition-all shadow-xl shadow-teal-900/30 disabled:opacity-50 disabled:scale-100 active:scale-95"
                  >
                    {isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      "Create Incident"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
