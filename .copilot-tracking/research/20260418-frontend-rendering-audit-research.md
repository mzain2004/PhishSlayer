<!-- markdownlint-disable-file -->

# Task Research Notes: Frontend Rendering Audit (App Pages and Layouts)

## Research Executed

### File Analysis

- app/page.tsx
  - Landing page is a large client-rendered marketing + auth modal implementation with Supabase auth calls and explicit mock UI sections.
- app/layout.tsx
  - Root layout renders global visual mesh and support widget; consent banner currently renders null.
- app/dashboard/page.tsx
  - Server component dashboard shell pulls scan/incident/intel counts from Supabase and composes many data widgets.
- app/dashboard/layout.tsx
  - Client layout enforces auth, renders sidebar/header/breadcrumb shell, and wraps children with dashboard error boundary.
- app/dashboard/agent/page.tsx, app/dashboard/agents/page.tsx
  - Endpoint monitoring UIs rely on server actions and real-time/event APIs plus CSV export.
- app/dashboard/identity/page.tsx, app/dashboard/mttr/page.tsx
  - Identity and MTTR pages are API-driven (v2 identity routes), with heavy presentational dashboards and report export.
- app/dashboard/threats/page.tsx
  - Threat intelligence page is scan-driven and orchestrates deep scan panels, heuristics, port patrol, SIEM push, takedown workflow.
- app/dashboard/scans/page.tsx
  - Scanner + history UI uses role-gated launch and list retrieval, with pagination/filtering and optional sandbox tab.
- app/dashboard/support/page.tsx
  - Support center includes operational status, FAQ, and ticket form posting to support + communications APIs.
- app/dashboard/settings/page.tsx + app/dashboard/settings/SettingsClient.tsx
  - Server wrapper hydrates profile values; client settings handles profile/avatar/password/API key/MFA workflows.
- app/about/page.tsx, app/blog/page.tsx, app/api-docs/page.tsx, app/legal/privacy/page.tsx, app/legal/terms/page.tsx
  - Primarily static informational pages with no live data dependencies.

### Code Search Results

- page|layout inventory (excluding app/api)
  - 40 frontend route files found: all app/**/page.tsx and app/**/layout.tsx excluding app/api.
- fetch\(|\.from\(|\.rpc\(|auth\.getUser|redirect\(
  - Data/auth/route control map established per page; redirects and Supabase/API usage verified.
- TODO|mock|placeholder|setTimeout\(
  - Placeholder/simulated behavior identified in auth 2FA, landing mock sections, terminal simulation, and selected settings/actions comments.
- /api/[...]
  - Referenced endpoints from pages and key components were cross-checked against route files; no missing route handlers found among discovered references.

### External Research

- #githubRepo:"not-run scope-limited-to-workspace"
  - Local repository audit did not require external code snippets; route/page behavior validation used official framework docs instead.
- #fetch:https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
  - Confirmed App Router semantics used in audit: page files render route UI, layout files provide shared nested shells, and route groups/nested layouts influence render boundaries.

### Project Conventions

- Standards referenced: Next.js App Router page/layout conventions, strict TypeScript mode, alias imports via @/\*, client/server component separation.
- Instructions followed: Read-only workspace audit, excluded app/api route handlers from page/layout inventory while still tracing API usage targets.

## Key Discoveries

### Project Structure

The frontend is App Router based with a root shell in app/layout.tsx and a dedicated dashboard shell in app/dashboard/layout.tsx. Dashboard routes are highly featureized (scans, threats, incidents, identity, support, agent fleet) and combine:

- server component entry points for authenticated data preloading (e.g., app/dashboard/page.tsx, app/dashboard/settings/page.tsx), and
- client-heavy interactive pages calling server actions (lib/supabase/actions.ts, lib/supabase/auth-actions.ts), Supabase client queries, and internal app/api route handlers.

Several routes are aliases/redirects rather than independent screens:

- app/auth/login/page.tsx -> redirect("/")
- app/auth/signup/page.tsx -> redirect("/")
- app/dashboard/protocols/page.tsx -> redirect("/dashboard/incidents")
- app/dashboard/sandbox/page.tsx -> redirect("/dashboard/scans")
- app/dashboard/audit-logs/page.tsx re-exports app/dashboard/audit/page.tsx
- app/(dashboard)/settings/billing/page.tsx re-exports app/dashboard/billing/page.tsx

### Implementation Patterns

- Shared widget composition: Dashboard pages use shared cards/badges/buttons and SOC widgets to compose larger workflows.
- Supabase patterns:
  - Server-side: createClient from lib/supabase/server in server components and server actions.
  - Client-side: createClient from lib/supabase/client in interactive pages/components.
- Data loading styles:
  - Direct fetch to app/api routes for operational workflows (identity, billing, support, deep scan, metrics).
  - Server actions for mutations and privileged queries (incidents, role changes, API keys, scan launch, intel vault operations).
- Role/tier gating:
  - RBAC hooks and role checks gate admin/audit/intel/actions.
  - Tier hooks and upgrade banners gate premium capabilities.

### Complete Examples

```tsx
// app/dashboard/page.tsx (server component composition + Supabase preload)
export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ data: scans }, { data: incidents }, { count: intelCount }] =
    await Promise.all([
      supabase
        .from("scans")
        .select("target, verdict, date, risk_score")
        .order("date", { ascending: false })
        .limit(100),
      supabase.from("incidents").select("status"),
      supabase
        .from("proprietary_intel")
        .select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="flex flex-col gap-6 text-white">
      <AgentSwarmPanel />
      <EscalationQueue />
      <Tier0BlockFeed />
      <L1DecisionLog />
      <NetworkTelemetryChart />
      <QuickActionsPanel />
      <L1AgentStatusWidget />
      <InfrastructureHealthWidget />
    </div>
  );
}
```

### API and Schema Documentation

Verified page/key-component API usage maps to implemented route handlers, including:

- Billing: /api/billing/subscription, /api/billing/portal, /api/billing/checkout
- Identity: /api/v2/identity/chain, /api/v2/identity/anomalies, /api/v2/identity/lifecycle, /api/v2/identity/report, /api/v2/identity/timeline
- Threat workflows: /api/deep-scan, /api/threat/ai-analysis, /api/recon/port-patrol
- Agent/SOC workflows: /api/agent/list, /api/agent/triage, /api/agent/respond, /api/agent/hunt, /api/agent/commands, /api/metrics, /api/metrics/network-telemetry, /api/actions/\*
- Support/communications: /api/support, /api/support/chat, /api/support/ticket, /api/communications

Primary Supabase tables referenced by pages or key components:

- profiles, scans, incidents, proprietary_intel, whitelist, audit_logs, escalations, hunt_findings, endpoint_events
- plus feature-specific/optional tables used in hunt/settings flows (e.g., sigma_rules, ctem_exposures, threat_intel, avatars)

### Configuration Examples

```json
// tsconfig.json (relevant frontend conventions)
{
  "compilerOptions": {
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Technical Requirements

- Frontend page rendering depends on:
  - authenticated Supabase session for most dashboard routes,
  - expected profile fields (role, subscription_tier, api_key, avatar_url),
  - availability of internal app/api routes,
  - presence of several domain tables for optional modules (especially hunt).
- Several screens are intentionally static/marketing/documentation pages.
- A subset of screens contain explicit placeholder/simulated logic that can present as functional UI without full backend effect.

## Recommended Approach

Use an evidence-first route audit matrix as the single source of truth for frontend readiness:

1. Inventory every non-api page/layout route.
2. Attach render evidence (major sections/widgets) from page source.
3. Attach data evidence (Supabase table calls, server actions, fetch endpoints).
4. Flag route class:
   - data-backed functional,
   - static informational,
   - alias/redirect,
   - simulated/placeholder behavior.
5. Prioritize remediation only for simulated/placeholder flows that can mislead users (2FA, terminal emulation, null consent banner, mock landing visuals presented as live telemetry).

This approach preserves accuracy, avoids assumptions about runtime environment, and directly maps to implementation tasks.

## Implementation Guidance

- **Objectives**: Maintain a complete, verifiable map of what each route actually renders and where data comes from.
- **Key Tasks**: Keep per-route summaries linked to source evidence; re-run endpoint/table checks when pages/components change.
- **Dependencies**: Supabase auth/profile schema, app/api route handlers, server action modules, role/tier policy helpers.
- **Success Criteria**: Every frontend page/layout is categorized with evidence and any simulated/static-only behavior is explicitly labeled.
