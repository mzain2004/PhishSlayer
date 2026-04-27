Before starting, list every file you will create. 
Create one file at a time. After each file say "FILE DONE" then continue.
Do not stop until all files complete.

Fix Docker build failure in PhishSlayer. Two issues to resolve:

ISSUE 1 — Groq client lazy init:
Find app/api/cases/[id]/report/route.ts (and any other route files that 
instantiate `new Groq(...)` at module top level).
Move ALL `new Groq(...)` calls inside the handler function body — never 
at module scope. Same pattern already used in other routes with lazy init.
This prevents build-time crash when GROQ_API_KEY env var is absent.

ISSUE 2 — Dockerfile missing GROQ_API_KEY:
In Dockerfile, add GROQ_API_KEY as ARG + ENV alongside the other API keys.
Also add CLERK_WEBHOOK_SECRET and GROQ_MODEL as ARG + ENV.
Pattern: follow existing ARG/ENV pairs for GEMINI_API_KEY.

After both fixes: run npm run build and fix ALL TypeScript/build errors 
before committing. Never commit broken build.
Do NOT modify server.js or middleware.ts. Do NOT overwrite .env files.