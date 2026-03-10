-- Phish-Slayer V3 Migration
-- Run this in Supabase SQL Editor

-- Port patrol data on scans
ALTER TABLE public.scans 
  ADD COLUMN IF NOT EXISTS port_patrol jsonb;

-- AI heuristic results cache on scans
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS ai_heuristic jsonb;

-- SIEM webhook on profiles  
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS siem_webhook_url text;

-- V3.1: Subscription tier
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

-- V3.1: Digest schedule preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS digest_schedule text DEFAULT 'monday_9am';

-- Set your own account to enterprise
UPDATE public.profiles 
SET subscription_tier = 'enterprise'
WHERE id = '1e4f7048-09e0-4fec-85d8-36d69d48b2ad';
