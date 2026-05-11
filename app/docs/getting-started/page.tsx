import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Getting Started — PhishSlayer Docs",
  description:
    "Install PhishSlayer, configure your environment, and connect your first integration.",
};

const S = {
  h1: {
    fontSize: 30,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 10,
  } as React.CSSProperties,
  h2: {
    fontSize: 20,
    fontWeight: 600,
    marginTop: 48,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
  } as React.CSSProperties,
  h3: {
    fontSize: 16,
    fontWeight: 600,
    marginTop: 28,
    marginBottom: 10,
    color: "var(--text-primary)",
  } as React.CSSProperties,
  p: {
    fontSize: 15,
    lineHeight: "1.75",
    color: "var(--text-secondary)",
    marginBottom: 16,
  } as React.CSSProperties,
  ul: { paddingLeft: 20, marginBottom: 16 } as React.CSSProperties,
  li: {
    fontSize: 15,
    lineHeight: "1.75",
    color: "var(--text-secondary)",
    marginBottom: 6,
  } as React.CSSProperties,
  note: {
    background: "rgba(124,92,255,0.08)",
    border: "1px solid rgba(124,92,255,0.25)",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
  } as React.CSSProperties,
  noteLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 4,
  } as React.CSSProperties,
  noteText: {
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  } as React.CSSProperties,
};

export default function GettingStartedPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Getting Started</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        Get PhishSlayer running in your environment in under 15 minutes. This
        guide covers installation, environment configuration, and connecting
        your first data source.
      </p>

      <h2 id="prerequisites" style={S.h2}>
        Prerequisites
      </h2>
      <p style={S.p}>Before you begin, ensure you have the following:</p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Node.js 18+</strong>{" "}
          or Bun 1.0+ installed on your development machine
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Supabase account
          </strong>{" "}
          — free tier is sufficient to start
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Clerk account
          </strong>{" "}
          — for authentication (free tier available)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Anthropic API key
          </strong>{" "}
          — required for L1/L2/L3 AI agents
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Redis</strong>{" "}
          (optional) — recommended for production queue processing via BullMQ
        </li>
      </ul>

      <h2 id="installation" style={S.h2}>
        Installation
      </h2>

      <h3 id="clone" style={S.h3}>
        1. Clone and Install
      </h3>
      <CodeBlock
        lang="bash"
        code={`git clone https://github.com/phishslayer/phishslayer.git
cd phishslayer
npm install`}
      />

      <h3 id="env-setup" style={S.h3}>
        2. Environment Configuration
      </h3>
      <p style={S.p}>
        Copy the example environment file and populate it with your credentials:
      </p>
      <CodeBlock lang="bash" code={`cp .env.example .env.local`} />
      <p style={S.p}>
        Open{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          .env.local
        </code>{" "}
        and fill in all required values:
      </p>
      <CodeBlock
        lang="bash"
        filename=".env.local"
        code={`# ── Supabase ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# ── Clerk Authentication ────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# ── AI Agents (Anthropic) ──────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── Optional: Redis for queue processing ───────────────
REDIS_URL=redis://localhost:6379

# ── Optional: Email delivery ───────────────────────────
RESEND_API_KEY=re_...

# ── Optional: Sentry error tracking ───────────────────
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...`}
      />

      <div style={S.note}>
        <div style={S.noteLabel}>Security note</div>
        <div style={S.noteText}>
          Never commit{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            .env.local
          </code>{" "}
          to version control. The{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            .gitignore
          </code>{" "}
          already excludes it, but double-check before pushing.
        </div>
      </div>

      <h3 id="database" style={S.h3}>
        3. Database Setup
      </h3>
      <p style={S.p}>Push the Supabase schema migrations to your project:</p>
      <CodeBlock
        lang="bash"
        code={`npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push`}
      />
      <p style={S.p}>
        This creates all required tables:{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          alerts
        </code>
        ,{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          iocs
        </code>
        ,{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          agents
        </code>
        ,{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          cases
        </code>
        ,{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          hunts
        </code>
        ,{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          reports
        </code>
        , and more.
      </p>

      <h3 id="dev-server" style={S.h3}>
        4. Start Development Server
      </h3>
      <CodeBlock lang="bash" code={`npm run dev`} />
      <p style={S.p}>
        The application starts on{" "}
        <strong
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          http://localhost:3000
        </strong>
        . The custom server at{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#9175FF",
          }}
        >
          server.js
        </code>{" "}
        handles WebSocket connections for real-time alert streaming.
      </p>

      <h2 id="first-login" style={S.h2}>
        First Login
      </h2>
      <ol style={{ paddingLeft: 22, marginBottom: 20 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Navigate to{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              background: "var(--bg-elevated)",
              padding: "2px 6px",
              borderRadius: 4,
              color: "#9175FF",
            }}
          >
            http://localhost:3000
          </code>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Click{" "}
          <strong style={{ color: "var(--text-primary)" }}>Get Started</strong>{" "}
          on the landing page
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Create your account via Clerk and verify your email
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          You will be redirected to{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              background: "var(--bg-elevated)",
              padding: "2px 6px",
              borderRadius: 4,
              color: "#9175FF",
            }}
          >
            /dashboard/alerts
          </code>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Complete the onboarding wizard to configure your organization
        </li>
      </ol>

      <h2 id="first-integration" style={S.h2}>
        Connect Your First Integration
      </h2>
      <p style={S.p}>
        PhishSlayer needs at least one data source to start generating alerts.
        The quickest way to test is with a Wazuh EDR agent, but you can also
        forward syslog, SIEM events, or email headers.
      </p>
      <ol style={{ paddingLeft: 22, marginBottom: 20 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Navigate to{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → Integrations
          </strong>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Select a connector (Wazuh, Microsoft 365, or Generic Syslog)
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Enter the required credentials or webhook URL
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Click{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Test Connection
          </strong>{" "}
          to verify the endpoint is reachable
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Toggle the integration{" "}
          <strong style={{ color: "var(--text-primary)" }}>Enabled</strong> to
          begin ingesting events
        </li>
      </ol>
      <p style={S.p}>
        Within a few minutes you should see the first alerts appear in the{" "}
        <strong style={{ color: "var(--text-primary)" }}>Alerts</strong> view
        and the L1 agent will begin triaging them automatically.
      </p>

      <h2 id="next-steps" style={S.h2}>
        Next Steps
      </h2>
      <ul style={S.ul}>
        <li style={S.li}>
          Deploy the Wazuh sensor on your endpoints →{" "}
          <a
            href="/docs/agents"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Agent Setup
          </a>
        </li>
        <li style={S.li}>
          Understand how alerts are scored and escalated →{" "}
          <a
            href="/docs/alerts"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Alerts & Triage
          </a>
        </li>
        <li style={S.li}>
          Add your first IOC feed →{" "}
          <a
            href="/docs/iocs"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            IOC Management
          </a>
        </li>
        <li style={S.li}>
          Explore the REST API →{" "}
          <a
            href="/docs/api"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            API Reference
          </a>
        </li>
      </ul>

      <footer
        style={{
          marginTop: 64,
          paddingTop: 20,
          borderTop: "1px solid var(--bg-border)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          Stuck? Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
    </>
  );
}
