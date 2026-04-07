"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import PhishButton from "@/components/ui/PhishButton";

export type IncidentRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  assigned_to: string | null;
  risk_score: number;
  created_at: string;
};

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  LOW: "bg-slate-500/10 text-[#8B949E] border-slate-500/20",
};

const statusColors: Record<string, string> = {
  Open: "bg-red-500/10 text-red-400 border-red-500/20",
  Investigating: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Resolved: "bg-green-500/10 text-green-400 border-green-500/20",
};

export const incidentColumns: ColumnDef<IncidentRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <PhishButton
        variant="secondary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Title <ArrowUpDown className="ml-2 h-3 w-3" />
      </PhishButton>
    ),
    cell: ({ row }) => (
      <span className="text-white font-medium text-sm">
        {row.getValue("title")}
      </span>
    ),
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => {
      const sev = (row.getValue("severity") as string) || "LOW";
      return (
        <Badge
          className={`${severityColors[sev] || severityColors.LOW} border text-xs font-medium uppercase`}
        >
          {sev}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string) || "Open";
      return (
        <Badge
          className={`${statusColors[status] || statusColors.Open} border text-xs font-medium`}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "assigned_to",
    header: "Assigned To",
    cell: ({ row }) => (
      <span className="text-[#8B949E] text-sm">
        {row.getValue("assigned_to") || "Unassigned"}
      </span>
    ),
  },
  {
    accessorKey: "risk_score",
    header: ({ column }) => (
      <PhishButton
        variant="secondary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Risk <ArrowUpDown className="ml-2 h-3 w-3" />
      </PhishButton>
    ),
    cell: ({ row }) => {
      const score = (row.getValue("risk_score") as number) || 0;
      const color =
        score >= 75
          ? "text-red-400"
          : score >= 40
            ? "text-yellow-400"
            : "text-green-400";
      return <span className={`text-sm font-mono ${color}`}>{score}/100</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <PhishButton
        variant="secondary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Created <ArrowUpDown className="ml-2 h-3 w-3" />
      </PhishButton>
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return (
        <span className="text-[#8B949E] text-sm">
          {date ? new Date(date).toLocaleString() : "—"}
        </span>
      );
    },
  },
];
