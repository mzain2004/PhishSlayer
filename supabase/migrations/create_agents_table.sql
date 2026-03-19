-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  hostname TEXT NOT NULL,
  ip_address TEXT,
  os TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'degraded')),
  last_seen TIMESTAMPTZ DEFAULT now(),
  agent_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "agents_own" ON public.agents;
CREATE POLICY "agents_own" ON public.agents
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "agents_super_admin" ON public.agents;
CREATE POLICY "agents_super_admin" ON public.agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Function to update last_seen on heartbeat
-- Note: This will be handled by upsert in server.js but good to have a trigger if needed
