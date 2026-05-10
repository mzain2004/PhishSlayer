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
      className={cn("p-6 rounded-lg", className)}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      {children}
    </div>
  );
}
