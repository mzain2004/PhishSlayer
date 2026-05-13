"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { useEffect, useState } from "react";
import { IPlus, IX } from "@/components/ui/icons";
import { SUPPORT_EMAIL } from "@/lib/email";

type TeamMember = {
  name: string;
  email: string;
  role: string;
  status: "active" | "pending";
};

type BillingInfo = {
  plan: string;
  amount: string;
  renews: string | null;
  alertUsage: number;
  alertLimit: number;
};

const FREE_BILLING: BillingInfo = {
  plan: "Free",
  amount: "$0/mo",
  renews: null,
  alertUsage: 0,
  alertLimit: 100,
};

const GRAPH_SCOPES = [
  "User.Read.All",
  "AuditLog.Read.All",
  "Directory.Read.All",
  "IdentityRiskEvent.Read.All",
];

export default function SettingsPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [billing, setBilling] = useState<BillingInfo>(FREE_BILLING);
  const usagePct = Math.min(100, Math.round((billing.alertUsage / Math.max(1, billing.alertLimit)) * 100));

  useEffect(() => {
    fetch("/api/team/members")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const items = Array.isArray(d) ? d : Array.isArray(d?.members) ? d.members : Array.isArray(d?.data) ? d.data : [];
        setTeam(
          items.map((m: Record<string, unknown>): TeamMember => ({
            name: typeof m.name === "string" ? m.name : (typeof m.email === "string" ? m.email.split("@")[0] : "Member"),
            email: typeof m.email === "string" ? m.email : "",
            role: typeof m.role === "string" ? m.role : "Analyst",
            status: m.status === "pending" ? "pending" : "active",
          })),
        );
      })
      .catch(() => { /* keep empty */ })
      .finally(() => setTeamLoading(false));

    fetch("/api/billing/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const sub = d?.subscription ?? d?.data ?? d;
        if (!sub) return;
        setBilling({
          plan: typeof sub.plan === "string" ? sub.plan : FREE_BILLING.plan,
          amount: typeof sub.amount === "string" ? sub.amount : FREE_BILLING.amount,
          renews: typeof sub.renews === "string" ? sub.renews : null,
          alertUsage: typeof sub.alert_usage === "number" ? sub.alert_usage : 0,
          alertLimit: typeof sub.alert_limit === "number" ? sub.alert_limit : FREE_BILLING.alertLimit,
        });
      })
      .catch(() => { /* leave Free tier */ });
  }, []);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <div className="subtitle">Integrations · billing · webhooks</div>
          <div style={{ marginTop: 6 }}>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{
                color: "var(--accent-400)",
                textDecoration: "underline",
                fontSize: 13,
              }}
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </header>

      <div className="settings-page">
        {/* Wazuh */}
        <div className="settings-card">
          <div className="head">
            <h3>Wazuh</h3>
            <span className="pill" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>Not connected</span>
          </div>
          <div className="meta">
            Generate a webhook token to receive alerts from your Wazuh manager.
          </div>
          <div className="actions">
            <a className="btn" href="/dashboard/settings/integrations">Configure</a>
            <a className="btn ghost" href="/docs/integrations">View docs</a>
          </div>
        </div>

        {/* Microsoft Graph */}
        <div className="settings-card">
          <div className="head">
            <h3>Microsoft Graph</h3>
            <span className="pill" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>Not connected</span>
          </div>
          <div className="meta">Connect your Microsoft 365 tenant to enrich alerts and respond to identity threats.</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              margin: "8px 0 12px",
            }}
          >
            {GRAPH_SCOPES.map((s) => (
              <span
                key={s}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "3px 8px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: 4,
                  color: "var(--text-secondary)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
          <div className="actions">
            <button className="btn">Re-authorize</button>
            <button className="btn ghost" style={{ color: "#FCA5A5" }}>
              Disconnect
            </button>
          </div>
        </div>

        {/* Billing */}
        <div className="settings-card">
          <div className="head">
            <h3>Polar Billing</h3>
            <span
              className="pill"
              style={{
                background: billing.plan === "Free" ? "var(--bg-elevated)" : "rgba(99,102,241,0.15)",
                color: billing.plan === "Free" ? "var(--text-secondary)" : "var(--accent-400)",
              }}
            >
              {billing.plan}
            </span>
          </div>
          <div className="meta">
            {billing.amount}
            {billing.renews ? ` · Renews ${billing.renews}` : ""}
          </div>

          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Alert usage this month
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                }}
              >
                {billing.alertUsage.toLocaleString()}/{billing.alertLimit.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: "var(--bg-base)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${usagePct}%`,
                  height: "100%",
                  background: "var(--accent-500)",
                  borderRadius: 999,
                  transition: "width 600ms ease",
                }}
              />
            </div>
            <div
              style={{
                textAlign: "right",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              {usagePct}% used
            </div>
          </div>

          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn primary">Upgrade to Command Center</button>
            <button className="btn">Manage billing</button>
          </div>
        </div>

        {/* Team */}
        <div className="settings-card">
          <div className="head">
            <h3>Team</h3>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {team.length} {team.length === 1 ? "member" : "members"}
            </span>
          </div>

          {teamLoading ? (
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-tertiary)" }}>Loading…</p>
          ) : team.length === 0 ? (
            <div style={{ marginTop: 12, padding: 16, textAlign: "center", border: "1px dashed var(--bg-border)", borderRadius: 8 }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>You haven&rsquo;t invited any teammates yet.</p>
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>Use &ldquo;Invite member&rdquo; below to add your first teammate.</p>
            </div>
          ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}
          >
            <thead>
              <tr>
                {["Name", "Email", "Role", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-tertiary)",
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--bg-border)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.email}>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--bg-border)",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background:
                            m.status === "pending"
                              ? "var(--bg-elevated)"
                              : "linear-gradient(135deg, #a855f7, var(--accent-500))",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          color:
                            m.status === "pending"
                              ? "var(--text-tertiary)"
                              : "white",
                          border:
                            m.status === "pending"
                              ? "1px dashed var(--bg-border)"
                              : "none",
                        }}
                      >
                        {m.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--bg-border)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {m.email}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--bg-border)",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 4,
                        letterSpacing: "0.04em",
                        background:
                          m.role === "SOC Manager"
                            ? "rgba(99,102,241,0.15)"
                            : "var(--bg-elevated)",
                        color:
                          m.role === "SOC Manager"
                            ? "var(--accent-400)"
                            : "var(--text-secondary)",
                        border: `1px solid ${m.role === "SOC Manager" ? "rgba(99,102,241,0.3)" : "var(--bg-border)"}`,
                      }}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--bg-border)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: m.status === "active" ? "#86EFAC" : "#FDE047",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            m.status === "active" ? "#22C55E" : "#EAB308",
                        }}
                      />
                      {m.status === "pending" ? "Pending invite" : "Active"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--bg-border)",
                    }}
                  >
                    <button
                      className="btn ghost"
                      style={{ padding: "2px 8px", fontSize: 11 }}
                    >
                      {m.status === "pending" ? "Resend" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => setShowInvite(true)}>
              <IPlus size={12} /> Invite member
            </button>
          </div>
        </div>
      </div>

      {showInvite && (
        <div className="modal-backdrop" onClick={() => setShowInvite(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>
              Invite team member
              <button
                className="btn ghost"
                style={{ padding: "2px 6px" }}
                onClick={() => setShowInvite(false)}
              >
                <IX size={13} />
              </button>
            </h3>
            <div className="field-group">
              <div>
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="teammate@example.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: 7,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label>Role</label>
                <select
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: 7,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                  }}
                >
                  <option>Analyst</option>
                  <option>SOC Manager</option>
                  <option>Read-only</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowInvite(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => setShowInvite(false)}
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
