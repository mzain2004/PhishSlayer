'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { getTierLimits, type Tier, type Role } from '@/lib/rbac/tierLimits'

export function useTier() {
  const [tier, setTier] = useState<Tier>('recon')
  const [role, setRole] = useState<Role>('analyst')
  const [loading, setLoading] = useState(true)
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    supabase.from('profiles')
      .select('subscription_tier, role')
      .eq('id', userId)
      .single()
      .then(({ data: profile }) => {
        if (profile) {
          setTier((profile.subscription_tier as Tier) ?? 'recon')
          setRole((profile.role as Role) ?? 'analyst')
        }
        setLoading(false)
      })
  }, [userId, isLoaded])

  const limits = getTierLimits(tier)
  const isSuperAdmin = role === 'super_admin'

  return { tier, role, limits, isSuperAdmin, loading }
}
