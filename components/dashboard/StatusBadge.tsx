import { cn } from "@/lib/utils";

type StatusTone = "critical" | "warning" | "healthy" | "escalated" | "pending";

type StatusBadgeProps = {
  status: StatusTone | string;
  label?: string;
  className?: string;
};

const statusStyles: Record<StatusTone, string> = {
  critical: "border-red-400/40 bg-red-500/15 text-red-200",
  warning: "border-yellow-400/40 bg-yellow-500/15 text-yellow-200",
  healthy: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  escalated: "border-orange-400/40 bg-orange-500/15 text-orange-200",
  pending: "border-gray-400/40 bg-gray-500/15 text-gray-200",
};

function normalizeStatus(status: string): StatusTone {
  const value = status.toLowerCase();

  if (value.includes("critical") || value === "high") {
    return "critical";
  }
  if (value.includes("warning") || value.includes("medium")) {
    return "warning";
  }
  if (
    value.includes("healthy") ||
    value.includes("active") ||
    value.includes("resolved") ||
    value.includes("approved")
  ) {
    return "healthy";
  }
  if (value.includes("escalated") || value.includes("auto_resolved")) {
    return "escalated";
  }

  return "pending";
}

export default function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  const normalized = normalizeStatus(status);
  const displayLabel = label || status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs uppercase tracking-widest",
        statusStyles[normalized],
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
