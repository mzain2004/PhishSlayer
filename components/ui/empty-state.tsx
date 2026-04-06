import { type LucideIcon, Shield } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({
  icon: Icon = Shield,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#8B949E]" />
      </div>
      <h3 className="text-base font-bold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-[#8B949E] max-w-sm mb-4">{description}</p>
      {action && (
        <a
          href={action.href}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}

