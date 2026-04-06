"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink } from "lucide-react";

export type ScanRow = {
  id: string;
  target: string;
  verdict: string;
  risk_score: number;
  threat_category: string;
  created_at: string;
  source: string;
};

const verdictColors: Record<string, string> = {
  malicious: "bg-red-500/10 text-red-400 border-red-500/20",
  suspicious: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  clean: "bg-green-500/10 text-green-400 border-green-500/20",
  whitelisted: "bg-slate-500/10 text-[#8B949E] border-slate-500/20",
};

export const scanColumns: ColumnDef<ScanRow>[] = [
  {
    accessorKey: "target",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Target <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-teal-400 text-sm">
        {row.getValue("target")}
      </span>
    ),
  },
  {
    accessorKey: "verdict",
    header: "Verdict",
    cell: ({ row }) => {
      const verdict = (row.getValue("verdict") as string) || "clean";
      return (
        <Badge
          className={`${verdictColors[verdict] || verdictColors.clean} border text-xs font-medium uppercase`}
        >
          {verdict}
        </Badge>
      );
    },
  },
  {
    accessorKey: "risk_score",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Risk <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = (row.getValue("risk_score") as number) || 0;
      const color =
        score >= 75
          ? "text-red-400"
          : score >= 40
            ? "text-yellow-400"
            : "text-green-400";
      const bg =
        score >= 75
          ? "bg-red-500"
          : score >= 40
            ? "bg-yellow-500"
            : "bg-green-500";
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${bg}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={`text-sm font-mono ${color}`}>{score}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "threat_category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-[#8B949E] text-sm">
        {row.getValue("threat_category") || "â€”"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-[#8B949E] hover:text-slate-100 -ml-3"
      >
        Scanned <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return (
        <span className="text-[#8B949E] text-sm">
          {date ? new Date(date).toLocaleString() : "â€”"}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          (window.location.href = `/dashboard/threats?scan=${row.original.id}`)
        }
        className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
      >
        <ExternalLink className="h-3 w-3 mr-1" /> Analyze
      </Button>
    ),
  },
];

