import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Agent Setup — PhishSlayer Docs",
  description:
    "Deploy the PhishSlayer Wazuh EDR sensor on Windows, Linux, and macOS endpoints.",
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
  noteLabel: {
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
};

export default function AgentsPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Agent Setup</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        PhishSlayer uses the open-source Wazuh EDR agent as its endpoint
        telemetry collector. This guide covers deploying and configuring the
        agent on Windows, Linux, and macOS endpoints, and registering them with
        your PhishSlayer organization.
      </p>

      <h2 id="architecture" style={S.h2}>
        Architecture Overview
      </h2>
      <p style={S.p}>
        Each endpoint runs a lightweight Wazuh agent that streams security
        events to the PhishSlayer ingest API. The ingest pipeline normalizes
        events into a common schema, scores them against active IOCs and
        detection rules, and forwards matches to the alert engine.
      </p>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 24,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: "1.8",
        }}
      >
        <div style={{ color: "#60A5FA" }}>Endpoint (Wazuh Agent)</div>
        <div style={{ paddingLeft: 16, color: "var(--text-tertiary)" }}>
          ↓ TLS 1.3
        </div>
        <div style={{ color: "#10B981" }}>
          PhishSlayer Ingest API (/api/ingest)
        </div>
        <div style={{ paddingLeft: 16, color: "var(--text-tertiary)" }}>
          ↓ Normalize &amp; score
        </div>
        <div style={{ color: "#7C5CFF" }}>
          Alert Engine → L1 Agent → L2/L3 (on escalation)
        </div>
        <div style={{ paddingLeft: 16, color: "var(--text-tertiary)" }}>
          ↓ Store
        </div>
        <div style={{ color: "#F97316" }}>
          Supabase (alerts, events, timeline)
        </div>
      </div>

      <h2 id="prerequisites" style={S.h2}>
        Prerequisites
      </h2>
      <ul style={S.ul}>
        <li style={S.li}>
          Your PhishSlayer organization API key (from{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → API Keys
          </strong>
          )
        </li>
        <li style={S.li}>
          Outbound HTTPS (port 443) access from the endpoint to{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              background: "var(--bg-elevated)",
              padding: "2px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            phishslayer.tech
          </code>
        </li>
        <li style={S.li}>
          Administrator / root privileges on the target machine
        </li>
        <li style={S.li}>
          Windows 10+, Ubuntu 20.04+, Debian 11+, RHEL 8+, macOS 12+, or Amazon
          Linux 2
        </li>
      </ul>

      <h2 id="windows" style={S.h2}>
        Windows Installation
      </h2>
      <p style={S.p}>Open PowerShell as Administrator and run:</p>
      <CodeBlock
        lang="bash"
        filename="install-windows.ps1"
        code={`# Download the PhishSlayer sensor installer
Invoke-WebRequest -Uri "https://phishslayer.tech/api/agent/download?os=windows" \`
  -Headers @{ "Authorization" = "Bearer YOUR_API_KEY" } \`
  -OutFile "$env:TEMP\PhishSlayerSensor.exe"

# Install and register with your organization
Start-Process -FilePath "$env:TEMP\PhishSlayerSensor.exe" \`
  -ArgumentList "--silent", "--org-key=YOUR_ORG_KEY", "--tag=production" \`
  -Wait

# Verify the service is running
Get-Service -Name "PhishSlayerSensor"`}
      />

      <p style={S.p}>
        The installer registers the agent with your organization automatically
        using the org key. The service starts immediately and begins streaming
        events within 60 seconds.
      </p>

      <div style={S.note}>
        <div style={{ ...S.noteLabel, color: "var(--accent)" }}>
          Group Policy Deployment
        </div>
        <div style={S.noteText}>
          For large Windows environments, use the MSI package and deploy via
          Group Policy or Intune. Download the MSI from{" "}
          <strong>Settings → Agents → Download MSI</strong>. The MSI accepts the
          same command-line arguments as the EXE installer.
        </div>
      </div>

      <h2 id="linux" style={S.h2}>
        Linux Installation
      </h2>

      <h3 id="linux-deb" style={S.h3}>
        Debian / Ubuntu
      </h3>
      <CodeBlock
        lang="bash"
        code={`# Add the PhishSlayer APT repository
curl -fsSL https://packages.phishslayer.tech/gpg | sudo gpg --dearmor -o /usr/share/keyrings/phishslayer.gpg
echo "deb [signed-by=/usr/share/keyrings/phishslayer.gpg] https://packages.phishslayer.tech/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/phishslayer.list

# Install the sensor
sudo apt-get update && sudo apt-get install -y phishslayer-sensor

# Configure the agent
sudo phishslayer-sensor configure --org-key YOUR_ORG_KEY --tag production

# Start and enable
sudo systemctl enable --now phishslayer-sensor`}
      />

      <h3 id="linux-rpm" style={S.h3}>
        RHEL / CentOS / Amazon Linux
      </h3>
      <CodeBlock
        lang="bash"
        code={`# Add the YUM repository
sudo rpm --import https://packages.phishslayer.tech/gpg
sudo tee /etc/yum.repos.d/phishslayer.repo << 'EOF'
[phishslayer]
name=PhishSlayer Sensor
baseurl=https://packages.phishslayer.tech/rpm/stable
enabled=1
gpgcheck=1
gpgkey=https://packages.phishslayer.tech/gpg
EOF

# Install and configure
sudo yum install -y phishslayer-sensor
sudo phishslayer-sensor configure --org-key YOUR_ORG_KEY --tag production
sudo systemctl enable --now phishslayer-sensor`}
      />

      <h2 id="macos" style={S.h2}>
        macOS Installation
      </h2>
      <CodeBlock
        lang="bash"
        code={`# Download via the API
curl -sSL "https://phishslayer.tech/api/agent/download?os=macos" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -o /tmp/PhishSlayerSensor.pkg

# Install (requires admin)
sudo installer -pkg /tmp/PhishSlayerSensor.pkg -target /

# Configure
sudo /Library/PhishSlayer/sensor configure --org-key YOUR_ORG_KEY

# Start the daemon
sudo launchctl load /Library/LaunchDaemons/tech.phishslayer.sensor.plist`}
      />

      <h2 id="configuration" style={S.h2}>
        Configuration
      </h2>
      <p style={S.p}>The agent configuration file is located at:</p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Windows:</strong>{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#60A5FA",
            }}
          >
            C:\Program Files\PhishSlayer\sensor.conf
          </code>
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Linux/macOS:</strong>{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#60A5FA",
            }}
          >
            /etc/phishslayer/sensor.conf
          </code>
        </li>
      </ul>
      <CodeBlock
        lang="yaml"
        filename="sensor.conf"
        code={`org_key: "YOUR_ORG_KEY"
ingest_url: "https://phishslayer.tech/api/ingest"
batch_size: 100
flush_interval: 15

# Telemetry modules to enable
modules:
  file_integrity: true
  process_monitor: true
  network_monitor: true
  registry_monitor: true   # Windows only
  log_collector: true

# Additional log sources
log_collector:
  - path: /var/log/auth.log
    type: syslog
  - path: /var/log/nginx/access.log
    type: nginx

# Exclusions (paths not monitored by FIM)
fim_exclusions:
  - /tmp
  - /proc
  - /sys`}
      />

      <h2 id="verify" style={S.h2}>
        Verifying Connectivity
      </h2>
      <p style={S.p}>
        After installation, verify the agent is registered and sending events:
      </p>
      <CodeBlock
        lang="bash"
        code={`# Check agent status (Linux/macOS)
sudo phishslayer-sensor status

# Test connectivity to the ingest endpoint
curl -sSf https://phishslayer.tech/api/health

# View recent events sent by this agent (via dashboard)
# Navigate to: Settings → Agents → [your-hostname] → Recent Events`}
      />
      <p style={S.p}>
        Newly registered agents appear in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Agents
        </strong>{" "}
        within 2 minutes of first contact. A green status dot indicates the
        agent is online and sending telemetry.
      </p>

      <h2 id="troubleshooting" style={S.h2}>
        Troubleshooting
      </h2>

      <h3 id="ts-offline" style={S.h3}>
        Agent shows as Offline
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          Confirm the service is running:{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            systemctl status phishslayer-sensor
          </code>
        </li>
        <li style={S.li}>
          Check outbound connectivity:{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            curl -v https://phishslayer.tech/api/health
          </code>
        </li>
        <li style={S.li}>
          Ensure port 443 is not blocked by a firewall or proxy. The sensor uses
          standard HTTPS — no special ports required.
        </li>
        <li style={S.li}>
          Review sensor logs:{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            journalctl -u phishslayer-sensor -n 100
          </code>
        </li>
      </ul>

      <h3 id="ts-auth" style={S.h3}>
        Authentication Errors
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          Verify the{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            org_key
          </code>{" "}
          in{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            sensor.conf
          </code>{" "}
          matches the key in{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → Agents → Org Key
          </strong>
        </li>
        <li style={S.li}>
          Rotate and reissue the key if compromised:{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → Agents → Rotate Key
          </strong>
        </li>
      </ul>

      <h3 id="ts-noevents" style={S.h3}>
        No Events Appearing
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          Check that the relevant telemetry modules are enabled in{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            sensor.conf
          </code>
        </li>
        <li style={S.li}>
          Trigger a test event:{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
              color: "#9175FF",
            }}
          >
            sudo phishslayer-sensor test-event
          </code>
        </li>
        <li style={S.li}>
          Verify ingest API reception at{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → Agents → [hostname] → Recent Events
          </strong>
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
          Deployment issues? Email{" "}
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
