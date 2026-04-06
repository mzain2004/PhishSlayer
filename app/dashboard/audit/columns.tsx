"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

export type AuditRow = {
  id: string;
  created_at: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
};

const actionCategoryColors: Record<string, string> = {
  scan: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  incident: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  intel: "bg-red-500/10 text-red-400 border-red-500/20",
  user: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  auth: "bg-slate-500/10 text-[#8B949E] border-slate-500/20",
  other: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

function getActionCategory(action: string): string {
  if (
    action.startsWith("scan") ||
    action.includes("deep_scan") ||
    action.includes("heuristic") ||
    action.includes("port_patrol")
  )
    return "scan";
  if (action.startsWith("incident")) return "incident";
  if (
    action.includes("intel") ||
    action.includes("whitelist") ||
    action.includes("block") ||
    action.includes("siem") ||
    action.includes("takedown")
  )
    return "intel";
  if (
    action.includes("user") ||
    action.includes("role") ||
    action.includes("profile") ||
    action.includes("api_key") ||
    action.includes("invited")
  )
    return "user";
  if (action.includes("login") || action.includes("logout")) return "auth";
  return "other";
}

export const auditColumns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Timestamp <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return (
        <span className="text-[#8B949E] text-xs font-mono">
          {date ? new Date(date).toLocaleString() : "â€”"}
        </span>
      );
    },
  },
  {
    accessorKey: "user_email",
    header: "User",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-slate-300 text-sm">
          {row.getValue("user_email") || "â€”"}
        </span>
        <Badge className="bg-slate-700/50 text-[#8B949E] border-slate-600 text-[10px]">
          {row.original.user_role}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      const cat = getActionCategory(action);
      return (
        <Badge
          className={`${actionCategoryColors[cat]} border text-xs font-mono`}
        >
          {action}
        </Badge>
      );
    },
  },
  {
    id: "resource",
    header: "Resource",
    cell: ({ row }) => {
      const type = row.original.resource_type;
      const id = row.original.resource_id;
      if (!type && !id) return <span className="text-slate-600">â€”</span>;
      return (
        <span className="text-[#8B949E] text-sm">
          {type && <span className="text-[#8B949E]">{type}/</span>}
          <span className="font-mono">
            {id ? (id.length > 20 ? id.slice(0, 20) + "â€¦" : id) : ""}
          </span>
        </span>
      );
    },
  },
  {
    id: "details",
    header: "Details",
    cell: ({ row }) => {
      const details = row.original.details;
      if (!details) return <span className="text-slate-600">â€”</span>;
      const str = JSON.stringify(details);
      return (
        <span className="text-[#8B949E] text-xs font-mono" title={str}>
          {str.length > 50 ? str.slice(0, 50) + "â€¦" : str}
        </span>
      );
    },
  },
];

