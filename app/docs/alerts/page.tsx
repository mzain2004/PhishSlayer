import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Alerts & Triage — PhishSlayer Docs",
  description:
    "Understand PhishSlayer alert severity levels, the alert lifecycle, and how L1/L2/L3 AI agents handle triage.",
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
  warn: {
    background: "rgba(234,179,8,0.08)",
    border: "1px solid rgba(234,179,8,0.25)",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 4,
  } as React.CSSProperties,
  noteText: {
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  } as React.CSSProperties,
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--bg-border)",
    fontSize: 14,
    color: "var(--text-secondary)",
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "10px 16px",
    borderBottom: "2px solid var(--bg-border)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  } as React.CSSProperties,
};

const SEV_BADGE = (color: string, label: string) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: `${color}20`,
      color,
      border: `1px solid ${color}40`,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.04em",
    }}
  >
    {label}
  </span>
);

export default function AlertsPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Alerts & Triage</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        PhishSlayer&apos;s alert system combines real-time event ingestion with
        a three-tier AI triage pipeline that automatically classifies,
        investigates, and responds to security events — reducing mean time to
        respond (MTTR) from hours to seconds.
      </p>

      <h2 id="severity-levels" style={S.h2}>
        Severity Levels
      </h2>
      <p style={S.p}>
        Every alert is assigned one of five severity levels during initial
        scoring. Severity drives SLA targets, escalation routing, and
        notification behavior.
      </p>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Level</th>
              <th style={S.th}>Score Range</th>
              <th style={S.th}>SLA (Response)</th>
              <th style={S.th}>Auto-escalation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>{SEV_BADGE("#EF4444", "CRITICAL")}</td>
              <td style={S.td}>90–100</td>
              <td style={S.td}>15 minutes</td>
              <td style={S.td}>Immediate L2 + L3</td>
            </tr>
            <tr>
              <td style={S.td}>{SEV_BADGE("#F97316", "HIGH")}</td>
              <td style={S.td}>70–89</td>
              <td style={S.td}>1 hour</td>
              <td style={S.td}>L2 within 5 min</td>
            </tr>
            <tr>
              <td style={S.td}>{SEV_BADGE("#EAB308", "MEDIUM")}</td>
              <td style={S.td}>40–69</td>
              <td style={S.td}>4 hours</td>
              <td style={S.td}>L2 if unacknowledged</td>
            </tr>
            <tr>
              <td style={S.td}>{SEV_BADGE("#6B7280", "LOW")}</td>
              <td style={S.td}>10–39</td>
              <td style={S.td}>24 hours</td>
              <td style={S.td}>L1 only</td>
            </tr>
            <tr>
              <td style={S.td}>{SEV_BADGE("#4B5563", "INFO")}</td>
              <td style={S.td}>0–9</td>
              <td style={S.td}>Best effort</td>
              <td style={S.td}>None</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="alert-lifecycle" style={S.h2}>
        Alert Lifecycle
      </h2>
      <p style={S.p}>
        Alerts move through a defined set of states from ingestion to
        resolution. Understanding this lifecycle helps analysts know when to act
        and what the AI agents are doing at each stage.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginBottom: 24,
          border: "1px solid var(--bg-border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {[
          {
            state: "New",
            color: "#60A5FA",
            desc: "Alert ingested. Awaiting L1 triage. No analyst action yet.",
          },
          {
            state: "Triaging",
            color: "#EAB308",
            desc: "L1 agent is scoring, deduplicating, and classifying the event.",
          },
          {
            state: "Escalated",
            color: "#F97316",
            desc: "L1 has confirmed the alert is genuine. L2 investigating context.",
          },
          {
            state: "Responded",
            color: "#7C5CFF",
            desc: "L2/L3 has executed or recommended a containment action.",
          },
          {
            state: "Closed",
            color: "#10B981",
            desc: "Incident resolved. Evidence preserved in the case record.",
          },
          {
            state: "False Positive",
            color: "#6B7280",
            desc: "Alert marked as FP. Feedback used to tune future detections.",
          },
        ].map(({ state, color, desc }, i) => (
          <div
            key={state}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 16px",
              borderBottom: i < 5 ? "1px solid var(--bg-border)" : "none",
              background: i % 2 === 0 ? "var(--bg-surface)" : "transparent",
            }}
          >
            <span
              style={{
                width: 110,
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color,
                background: `${color}18`,
                padding: "3px 8px",
                borderRadius: 4,
                display: "inline-block",
                textAlign: "center",
              }}
            >
              {state.toUpperCase()}
            </span>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {desc}
            </span>
          </div>
        ))}
      </div>

      <h2 id="l1-agent" style={S.h2}>
        L1 Triage Agent
      </h2>
      <p style={S.p}>
        The L1 agent runs continuously, processing raw events from all connected
        sources. It applies rule-based and ML scoring before invoking the
        Anthropic Claude API for contextual classification.
      </p>

      <h3 id="l1-tasks" style={S.h3}>
        What L1 does
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Deduplication
          </strong>{" "}
          — Groups repeated events within a 5-minute window into a single alert,
          avoiding analyst fatigue.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Scoring</strong> —
          Combines MITRE ATT&CK technique severity, IOC match confidence, and
          behavioral baseline deviation into a composite score (0–100).
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Auto-classification
          </strong>{" "}
          — Tags the alert with threat category (Phishing, Malware, Lateral
          Movement, Exfiltration, etc.).
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            IOC extraction
          </strong>{" "}
          — Pulls IP addresses, domains, hashes, and email addresses from event
          payloads and cross-references the IOC database.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Auto-close</strong> —
          Closes alerts with a score below 5 and no IOC matches automatically,
          with a reason logged for audit.
        </li>
      </ul>

      <h2 id="l2-agent" style={S.h2}>
        L2 Investigation Agent
      </h2>
      <p style={S.p}>
        The L2 agent activates on High and Critical alerts (and on Medium alerts
        that remain unacknowledged for more than 2 hours). It performs deep
        contextual investigation using all available telemetry.
      </p>

      <h3 id="l2-tasks" style={S.h3}>
        What L2 does
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Timeline reconstruction
          </strong>{" "}
          — Correlates events across all ingested sources to build a full attack
          timeline.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            MITRE ATT&CK mapping
          </strong>{" "}
          — Maps observed behaviors to techniques and tactics in the MITRE
          ATT&CK Enterprise matrix.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Blast radius assessment
          </strong>{" "}
          — Identifies other users, endpoints, and systems potentially affected
          by the same attacker.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Response recommendations
          </strong>{" "}
          — Produces a prioritized list of containment actions (block IP,
          isolate endpoint, reset password, revoke token).
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Draft case</strong> —
          Automatically creates a Case with the investigation summary and
          evidence attached.
        </li>
      </ul>

      <h2 id="l3-agent" style={S.h2}>
        L3 Response & Hunt Agent
      </h2>
      <p style={S.p}>
        L3 is PhishSlayer&apos;s most capable agent and is only invoked for
        Critical alerts or when manually triggered by a senior analyst. It has
        direct tool access to execute containment actions.
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Autonomous containment
          </strong>{" "}
          — Can isolate endpoints via Wazuh, block IPs on perimeter devices,
          disable Entra ID accounts, and revoke OAuth tokens.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Forensic evidence collection
          </strong>{" "}
          — Pulls process trees, memory dumps, network captures, and log
          excerpts from affected endpoints.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Threat hunt pivot
          </strong>{" "}
          — Automatically hunts for similar indicators across all connected
          endpoints to identify the full scope of compromise.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Narrative report
          </strong>{" "}
          — Generates a plain-English incident narrative ready for board-level
          communication.
        </li>
      </ul>

      <div style={S.note}>
        <div style={{ ...S.label, color: "var(--accent)" }}>Note</div>
        <div style={S.noteText}>
          L3 autonomous containment actions require explicit approval in your
          organization settings by default. Navigate to{" "}
          <strong>Settings → AI Agents → L3 Autonomy</strong> to configure which
          actions can run without analyst confirmation.
        </div>
      </div>

      <h2 id="manual-actions" style={S.h2}>
        Manual Actions
      </h2>
      <p style={S.p}>
        Analysts can take the following actions on any alert from the detail
        panel or the alerts table:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Acknowledge</strong>{" "}
          — Signals you are investigating. Pauses SLA clock. Keyboard shortcut:{" "}
          <kbd
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            A
          </kbd>
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Assign</strong> —
          Assigns to a specific analyst or team. Sends a notification to the
          assignee.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Escalate to L2
          </strong>{" "}
          — Manually triggers L2 investigation even if below the auto-escalation
          threshold.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Mark as False Positive
          </strong>{" "}
          — Closes the alert and submits signal to improve future ML scoring.
          Keyboard:{" "}
          <kbd
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            F
          </kbd>
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Create Case</strong>{" "}
          — Promotes the alert to a formal case with evidence tracking and chain
          of custody.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Export</strong> —
          Exports the alert and all associated evidence as a PDF or JSON bundle.
        </li>
      </ul>

      <h2 id="bulk-operations" style={S.h2}>
        Bulk Operations
      </h2>
      <p style={S.p}>
        Select multiple alerts using the checkbox column (or{" "}
        <kbd
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            borderRadius: 4,
            padding: "1px 5px",
          }}
        >
          Shift+Click
        </kbd>{" "}
        for range selection) to apply bulk actions:
      </p>
      <CodeBlock
        lang="bash"
        code={`# Bulk actions available on multiple selected alerts:
# - Acknowledge all
# - Assign to analyst
# - Mark as false positive
# - Close with reason
# - Export bundle (JSON/PDF)`}
      />

      <h2 id="configuration" style={S.h2}>
        Alert Configuration
      </h2>
      <p style={S.p}>
        Tune alert behavior in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Detection Rules
        </strong>
        . You can:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          Create custom detection rules using Sigma-compatible syntax
        </li>
        <li style={S.li}>Adjust severity thresholds per rule or per source</li>
        <li style={S.li}>
          Set suppression windows to prevent duplicate alert floods during known
          maintenance
        </li>
        <li style={S.li}>
          Configure notification routes (Slack, PagerDuty, email) per severity
          level
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
          Need help with alert tuning? Email{" "}
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
