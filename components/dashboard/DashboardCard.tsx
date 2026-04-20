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
        "glass p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
