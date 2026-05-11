import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Threat Hunting — PhishSlayer Docs",
  description:
    "Run proactive threat hunts with the PhishSlayer L3 agent against your endpoint telemetry.",
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

export default function HuntingPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Threat Hunting</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        Proactive threat hunting lets you search your environment for attacker
        activity that bypassed automated detection. PhishSlayer&apos;s L3 Hunt
        Agent combines natural-language queries, structured telemetry search,
        and MITRE ATT&CK guided hypotheses to uncover hidden threats.
      </p>

      <h2 id="overview" style={S.h2}>
        Overview
      </h2>
      <p style={S.p}>
        Unlike reactive alerting, threat hunting assumes a breach has already
        occurred and looks for evidence of attacker presence — dormant malware,
        credential abuse, lateral movement, and pre-exfiltration staging.
      </p>
      <p style={S.p}>
        The L3 Hunt Agent operates across all data sources connected to your
        organization: Wazuh EDR telemetry, Windows Event Logs, Microsoft 365
        audit logs, and any custom log sources you have configured via the
        ingest API.
      </p>

      <h2 id="hypotheses" style={S.h2}>
        Hunt Hypotheses
      </h2>
      <p style={S.p}>
        A hypothesis is a structured starting point for a hunt. It describes
        what attacker behavior you expect to find and maps it to MITRE ATT&CK
        techniques. PhishSlayer comes with a library of pre-built hypotheses
        tuned to common attack patterns.
      </p>

      <h3 id="builtin-hypotheses" style={S.h3}>
        Built-in Hypothesis Library
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Living-off-the-Land Binaries (LOLBAS)
          </strong>{" "}
          — Detects abuse of legitimate Windows binaries (certutil, regsvr32,
          mshta, wscript) for payload execution.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Credential Dumping
          </strong>{" "}
          — Hunts for LSASS memory reads, SAM database access, and DCSync
          patterns.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Lateral Movement via WMI/PSExec
          </strong>{" "}
          — Identifies remote execution patterns across the environment.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Suspicious PowerShell
          </strong>{" "}
          — Flags encoded commands, download-cradles, and AMSI bypass attempts.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Beaconing Detection
          </strong>{" "}
          — Statistical analysis of outbound connections to identify C2
          beaconing intervals.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Email-based Initial Access
          </strong>{" "}
          — Hunts for execution chains originating from email client processes
          (Outlook, Thunderbird).
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Persistence via Registry/Scheduled Tasks
          </strong>{" "}
          — Detects new autorun entries, scheduled tasks, and WMI subscriptions.
        </li>
      </ul>

      <h3 id="custom-hypotheses" style={S.h3}>
        Creating a Custom Hypothesis
      </h3>
      <p style={S.p}>
        Navigate to{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Hunting → Hypotheses → New Hypothesis
        </strong>{" "}
        and fill in:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Name</strong> — Short
          descriptive title
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Description</strong>{" "}
          — What attacker behavior you are looking for and why
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            MITRE Techniques
          </strong>{" "}
          — One or more ATT&CK technique IDs (e.g. T1059.001, T1078)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Data Sources</strong>{" "}
          — Which log sources are relevant (Wazuh, M365, DNS, etc.)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Hunt Query</strong> —
          Optional structured query or natural language description
        </li>
      </ul>

      <h2 id="running-a-hunt" style={S.h2}>
        Running a Hunt
      </h2>
      <p style={S.p}>
        You can start a hunt from{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Hunting → New Hunt
        </strong>
        . Choose an existing hypothesis or describe what you are looking for in
        plain English and the L3 agent will build the query for you.
      </p>

      <h3 id="natural-language" style={S.h3}>
        Natural Language Queries
      </h3>
      <p style={S.p}>
        Type a description and the agent translates it into structured telemetry
        queries across all relevant data sources:
      </p>
      <CodeBlock
        lang="bash"
        code={`# Example natural language hunt queries:
"Find all PowerShell executions in the last 7 days that contacted external IPs"
"Show me accounts that logged in from two different countries within 6 hours"
"Hunt for any process that spawned cmd.exe as a child of a browser process"
"Identify endpoints with new scheduled tasks created in the past 24 hours"`}
      />

      <h3 id="structured-queries" style={S.h3}>
        Structured Queries
      </h3>
      <p style={S.p}>
        For precise, repeatable hunts, use the Wazuh Query Language (WQL)
        directly:
      </p>
      <CodeBlock
        lang="bash"
        code={`# Hunt for LSASS credential dumping attempts
rule.groups: windows AND
data.win.eventdata.targetFileName: "*lsass*" AND
data.win.eventdata.grantedAccess: "0x1010"

# Hunt for suspicious base64-encoded PowerShell
rule.groups: windows AND
data.win.eventdata.commandLine: "*-enc*" AND
data.win.eventdata.image: "*powershell*"`}
      />

      <h3 id="time-range" style={S.h3}>
        Time Range Selection
      </h3>
      <p style={S.p}>
        Select the lookback window for your hunt. Available options depend on
        your plan&apos;s data retention setting:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>Last 24 hours</li>
        <li style={S.li}>Last 7 days</li>
        <li style={S.li}>Last 30 days</li>
        <li style={S.li}>Last 90 days (SOC Pro+)</li>
        <li style={S.li}>Last 365 days (Command Center+)</li>
        <li style={S.li}>Custom range (Command Center+)</li>
      </ul>

      <h2 id="results" style={S.h2}>
        Interpreting Results
      </h2>
      <p style={S.p}>
        Hunt results are presented in a structured findings panel with three
        sections:
      </p>

      <h3 id="findings" style={S.h3}>
        Findings
      </h3>
      <p style={S.p}>
        Each finding represents a matched event or behavior cluster. The L3
        agent assigns a{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Confidence Score
        </strong>{" "}
        (0–100) and a{" "}
        <strong style={{ color: "var(--text-primary)" }}>Risk Level</strong>{" "}
        based on:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          How closely the behavior matches known attack patterns
        </li>
        <li style={S.li}>Whether associated IOCs are in your threat feed</li>
        <li style={S.li}>
          Baseline deviation from normal activity for that user/host
        </li>
        <li style={S.li}>Correlation with other recent alerts or hunts</li>
      </ul>

      <h3 id="indicators" style={S.h3}>
        Indicators Extracted
      </h3>
      <p style={S.p}>
        The agent automatically extracts and enriches any IOCs found during the
        hunt — IPs, domains, hashes, and email addresses are cross-referenced
        against your IOC database and external threat feeds in real time.
      </p>

      <h3 id="attack-chain" style={S.h3}>
        Attack Chain Visualization
      </h3>
      <p style={S.p}>
        For hunts that discover multi-stage activity, the L3 agent constructs an
        attack chain diagram mapping the sequence of techniques from initial
        access through to the detected stage. You can promote the hunt findings
        directly into a new{" "}
        <strong style={{ color: "var(--text-primary)" }}>Case</strong> for
        formal investigation.
      </p>

      <h2 id="scheduling" style={S.h2}>
        Scheduling Recurring Hunts
      </h2>
      <p style={S.p}>
        Once you have a hunt hypothesis that produces reliable results, you can
        schedule it to run automatically:
      </p>
      <ol style={{ paddingLeft: 22, marginBottom: 20 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Open the hunt results and click{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Schedule this Hunt
          </strong>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Select recurrence: hourly, daily, weekly, or custom cron expression
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Set a confidence threshold — only create alerts when findings exceed
          this score
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Configure notification routing (Slack, email, PagerDuty)
        </li>
      </ol>

      <div style={S.note}>
        <div style={S.noteLabel}>Tip</div>
        <div style={S.noteText}>
          Scheduled hunts run via the{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            /api/cron/l3-hunt
          </code>{" "}
          endpoint. This endpoint is called by your deployment&apos;s cron
          infrastructure every 15 minutes and dispatches any scheduled hunts
          that are due.
        </div>
      </div>

      <h2 id="mitre" style={S.h2}>
        MITRE ATT&CK Integration
      </h2>
      <p style={S.p}>
        PhishSlayer maintains a local copy of the MITRE ATT&CK Enterprise matrix
        (updated quarterly) and uses it to:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          Tag alerts and hunt findings with technique IDs automatically
        </li>
        <li style={S.li}>
          Show coverage heat maps in the{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Metrics → MITRE Coverage
          </strong>{" "}
          view
        </li>
        <li style={S.li}>
          Surface related techniques during L2 and L3 investigation
        </li>
        <li style={S.li}>
          Generate ATT&CK navigator layer exports for board reporting
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
          Questions about hunt strategy? Email{" "}
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
