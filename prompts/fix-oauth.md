Read ONLY these files:
- app/page.tsx
- app/globals.css

Replace app/page.tsx entirely with a full landing page that:
- Is a SERVER component using: import { auth } from '@clerk/nextjs/server'
- At top: const { userId } = await auth(); if (userId) redirect('/dashboard');
- Has a navbar: logo "PhishSlayer" left, "Log In" and "Sign Up" buttons right linking to /sign-in and /sign-up
- Hero section: badge "AI Threat Detection Active", headline "NEUTRALIZE THREATS INSTANTLY. ELIMINATE DWELL TIME FOREVER." in bold white uppercase, subtext "Experience immediate, automated defense with real-time visibility, eliminating risks before impact."
- Two CTA buttons: "Get Started" → /sign-up (cyan #22d3ee filled), "Log In" → /sign-in (outline)
- Feature section with 3 cards: "Autonomous Triage", "AI Threat Intel", "Zero Dwell Time"
- Mission/Vision section: two cards side by side
- Background: dark #0a0a0a, accent #22d3ee, no external images, no framer-motion, no lucide imports, pure Tailwind only
- NO rounded-full buttons — use rounded-none
- Zero external dependencies beyond what Next.js and Tailwind already provide

Run npm run build, fix ALL errors, commit and push.