-- Ensure support_tickets table exists with correct columns
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets" 
ON public.support_tickets FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Users can create their own tickets (redundant for server-side but good for safety)
CREATE POLICY "Users can create own tickets" 
ON public.support_tickets FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Storage: Ensure support-attachments bucket exists
-- Note: This usually needs to be done via the Supabase Dashboard or a separate script
-- but we'll include the bucket configuration logic here for reference.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', true);
