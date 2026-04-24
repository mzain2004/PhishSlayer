Task: Fix CORS and CSP issues blocking dashboard redirect after Clerk signup

Read ONLY this file:
next.config.ts

Do not read any other file.

The current CSP is blocking Clerk's post-signup redirect to /dashboard.
Errors seen:
- accounts.phishslayer.tech blocked by CORS
- script-src was not explicitly set so default-src used as fallback
- Cloudflare Turnstile CAPTCHA TrustedHTML blocked

Replace the entire Content-Security-Policy header value with exactly this:

default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval'
  https://clerk.phishslayer.tech
  https://accounts.phishslayer.tech
  https://challenges.cloudflare.com
  https://static.cloudflareinsights.com
  https://app.termly.io;
script-src-elem 'self' 'unsafe-inline'
  https://clerk.phishslayer.tech
  https://accounts.phishslayer.tech
  https://challenges.cloudflare.com
  https://static.cloudflareinsights.com
  https://app.termly.io;
worker-src 'self' blob:;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self'
  https://clerk.phishslayer.tech
  https://accounts.phishslayer.tech
  https://challenges.cloudflare.com
  https://*.clerk.accounts.dev
  https://*.supabase.co
  wss://*.supabase.co
  https://api.clerk.com;
frame-src 'self'
  https://challenges.cloudflare.com
  https://accounts.phishslayer.tech;
frame-ancestors 'none';

Make sure the CSP is a single string with semicolons between directives.
Make sure worker-src includes blob: — this is required for Cloudflare Turnstile.
Make sure script-src includes 'unsafe-inline' — required for Clerk components.

Do not touch any other configuration in next.config.ts.
Do not modify any other file.

Run npm run build, fix all errors.
Commit: fix: complete CSP overhaul for Clerk CORS and Cloudflare Turnstile, push.