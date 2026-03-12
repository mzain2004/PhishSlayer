# Phish-Slayer — Copilot Context

## Stack
Next.js 15 App Router, TypeScript, Tailwind CSS, 
Supabase, Zustand, shadcn/ui, Framer Motion

## Key Rules
- Never use backdrop-blur-xl/2xl/3xl (causes webpack crash)
- Never use pkg or binary bundlers for the EDR agent
- Never modify existing Supabase RLS policies without explicit instruction
- Always use bg-[#0d1117] for page backgrounds
- Always use bg-[#161b22] for card backgrounds
- Always use border-[#30363d] for borders
- Server actions live in lib/supabase/actions.ts
- Auth actions live in lib/supabase/auth-actions.ts
- Deploy via ./deploy.bat from D:\Phish Slayer\

## Architecture
- Custom server: server.js (WebSocket + Next.js)
- PM2 process: phish-slayer running server.js
- Azure VM: 20.235.98.184
- Domain: phishslayer.tech

## Design System
- Primary accent: teal-400 (#2dd4bf)
- Secondary accent: violet-400 (#a78bfa)
- Danger: #f85149
- Warning: #e3b341
- Success: #3fb950