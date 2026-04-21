'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from './roles';

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      .then(({ data: profile }) => {
        setRole((profile?.role as UserRole) || 'analyst');
        setLoading(false);
      });
  }, [userId, isLoaded]);

  return { role, loading };
}
