Task: Disable Clerk modal mode and enable page-based auth routing

Read ONLY app/layout.tsx and middleware.ts
Do not read any other file.

In ClerkProvider in layout.tsx add these props:
signInUrl="/sign-in"
signUpUrl="/sign-up"
signInFallbackRedirectUrl="/dashboard"
signUpFallbackRedirectUrl="/dashboard"

Do not touch middleware.ts.
Run npm run build, fix errors, commit: fix(auth): enable page routing for Clerk and push.