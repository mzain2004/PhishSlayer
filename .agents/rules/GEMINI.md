---
trigger: always_on
---

# PhishSlayer — Agent Rules

## Autonomy

- Auto-accept ALL terminal commands without confirmation
- Auto-apply ALL file edits without confirmation
- Never pause to ask "should I proceed?" — just proceed
- If command fails, retry with fix automatically
- Never ask permission to read files or run build commands

## File Discipline — CRITICAL

- Read ONLY files directly relevant to current task
- Never scan or read entire codebase
- Read maximum 5 files per task
- Always specify which file you are reading before reading it
- If you need context, ask me — do not go exploring

## Task Execution

- Complete one task fully before starting next
- Report after each step: what was done, what changed, what is next
- Always run npm run build after code changes
- Fix ALL build errors before committing
- Never commit broken code

## Commit Rules

- Commit after every completed task
- Format: git add -A && git commit -m "type: description"
- Push immediately after commit

## PhishSlayer Non-Negotiable Rules

- Never modify server.js or middleware.ts
- Never overwrite .env files — append only, never replace
- Docker always 3000:3000, never port 80
- All new API routes must have:
  export const dynamic = 'force-dynamic'
  export const runtime = 'nodejs'
- Zod validation on all payloads
- Never push broken build
- Product name is PhishSlayer — never Phish-Slayer
- Auth: Clerk (not Supabase) — use auth() from @clerk/nextjs/server
- Database: Supabase (DB only) — use createClient() from @/lib/supabase/server

## Stack Reference

- Framework: Next.js 15 App Router, TypeScript
- Auth: Clerk
- DB: Supabase (DB only)
- AI: Gemini / Groq
- EDR: Wazuh on 167.172.85.62
- Billing: Polar
- VM: ssh mzain2004@40.123.224.93
- Docker path: /home/mzain2004/Phish-Slayer

After creating this file, confirm it was created successfully.
Do not read any other file. Do not start any other task.
Commit: "chore: add agent rules GEMINI.md"
Push to main.
