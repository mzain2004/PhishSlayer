Task: Fix CSP headers, create webhook handler, and add auth pages

Read ONLY: next.config.ts, app/api/webhooks/clerk/route.ts if exists
Do not read any other file.

PART 1 - CSP fix in next.config.ts:
Add to script-src: https://accounts.google.com https://clerk.com https://clerk.phishslayer.tech.clerk.accounts.dev
Add to connect-src: https://accounts.google.com https://clerk.com https://clerk.phishslayer.tech.clerk.accounts.dev
Add to frame-src: https://accounts.google.com https://clerk.com https://clerk.phishslayer.tech.clerk.accounts.dev
Add to img-src: https://img.clerk.com

PART 2 - Create app/api/webhooks/clerk/route.ts:
export const dynamic = force-dynamic
export const runtime = nodejs
Use svix to verify signature from CLERK_WEBHOOK_SECRET env var
On user.created: insert into supabase table users with id from clerk sub, email, created_at
On user.deleted: delete from users where id matches
Use createClient from @/lib/supabase/server
Return 200 on success, 400 on failure

PART 3 - Create app/sign-in/page.tsx:
Full screen dark background #0a0a0f, centered glass card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl
Render SignIn from @clerk/nextjs with routing=path path=/sign-in signUpUrl=/sign-up

PART 4 - Create app/sign-up/page.tsx:
Same layout as sign-in page
Render SignUp from @clerk/nextjs with routing=path path=/sign-up signInUrl=/sign-in

Run npm run build, fix all errors.
Commit: feat(auth): CSP fix, webhook handler, dedicated auth pages and push.