import { createClient } from '@/lib/supabase/server'
import PhishSlayerLanding from '@/components/PhishSlayerLanding'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <PhishSlayerLanding isAuthenticated={!!user} />
}
