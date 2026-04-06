import { Lock } from 'lucide-react'
import Link from 'next/link'

interface UpgradeBannerProps {
  feature: string
  requiredTier: string
}

export function UpgradeBanner({ feature, requiredTier }: UpgradeBannerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 liquid-glass rounded-xl text-center shadow-lg space-y-4 max-w-lg mx-auto mt-12">
      <div className="p-4 bg-slate-800/50 rounded-full border border-slate-700">
        <Lock className="w-8 h-8 text-[#2dd4bf]" />
      </div>
      
      <h3 className="text-xl font-bold text-white tracking-tight">
        {feature} is Locked
      </h3>
      
      <p className="text-[#8B949E] text-sm">
        This feature requires the <span className="text-[#2dd4bf] font-medium">{requiredTier}</span> plan or higher. Upgrade your workspace to unlock advanced threat intelligence capabilities.
      </p>
      
      <Link 
        href="/pricing"
        className="mt-4 inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-black bg-[#2dd4bf] hover:bg-[#20b2a0] rounded-lg transition-colors duration-200"
      >
        Upgrade Plan
      </Link>
    </div>
  )
}

