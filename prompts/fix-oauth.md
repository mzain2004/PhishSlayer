Task: Create case management dashboard component

Create file app/dashboard/cases/page.tsx only
Show list of cases with: severity badge, status, alert_type, source_ip, created_at, sla_deadline
Color coding: P1 red #ff4d4f, P2 orange #f5a623, P3 yellow, P4 gray
Use existing design system: background #0a0a0f, glass cards, primary #7c6af7
Font: Inter for UI, JetBrains Mono for IPs and timestamps
Fetch from /api/cases and handle loading and error states
Do not touch any other file.
Run npm run build, fix errors, commit: feat: cases dashboard UI, push.