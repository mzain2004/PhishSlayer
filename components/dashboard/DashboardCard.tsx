import { cn } from "@/lib/utils";

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function DashboardCard({
  children,
  className,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
