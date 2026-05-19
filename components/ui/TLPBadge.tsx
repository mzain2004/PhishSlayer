'use client'

import { cn } from '@/lib/utils'

export type TLPLevel = 'white' | 'green' | 'amber' | 'red'

const TLP_CONFIG: Record<TLPLevel, {
  label: string
  bg: string
  text: string
  border: string
  description: string
}> = {
  white: {
    label: 'TLP:WHITE',
    bg: 'bg-white dark:bg-gray-100',
    text: 'text-gray-900',
    border: 'border-gray-300',
    description: 'Unrestricted. May be distributed freely.',
  },
  green: {
    label: 'TLP:GREEN',
    bg: 'bg-green-600',
    text: 'text-white',
    border: 'border-green-700',
    description: 'Community. Share within your industry community.',
  },
  amber: {
    label: 'TLP:AMBER',
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-600',
    description: 'Limited. Share with your organization on need-to-know.',
  },
  red: {
    label: 'TLP:RED',
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-700',
    description: 'Restricted. Named recipients only. Do not forward.',
  },
}

interface TLPBadgeProps {
  level: TLPLevel
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

export function TLPBadge({
  level,
  size = 'sm',
  showTooltip = true,
  className,
}: TLPBadgeProps) {
  const config = TLP_CONFIG[level] ?? TLP_CONFIG.amber

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1 text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold rounded border cursor-default select-none',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className,
      )}
      title={showTooltip ? config.description : undefined}
      aria-label={`Traffic Light Protocol: ${config.label} — ${config.description}`}
    >
      {config.label}
    </span>
  )
}

interface TLPSelectorProps {
  value: TLPLevel
  onChange: (level: TLPLevel) => void
  disabled?: boolean
  className?: string
}

export function TLPSelector({ value, onChange, disabled, className }: TLPSelectorProps) {
  const levels: TLPLevel[] = ['white', 'green', 'amber', 'red']

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        TLP Classification
      </label>
      <div className="flex gap-2 flex-wrap">
        {levels.map(level => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            className={cn(
              'transition-all duration-150',
              value === level
                ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-105'
                : 'opacity-50 hover:opacity-80',
            )}
            title={TLP_CONFIG[level].description}
          >
            <TLPBadge level={level} size="md" showTooltip={false} />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        {TLP_CONFIG[value]?.description}
      </p>
    </div>
  )
}
