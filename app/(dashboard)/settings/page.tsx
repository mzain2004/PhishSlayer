'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useState } from 'react';
import { IPlus, IX } from '@/components/ui/icons';

const TEAM_MEMBERS = [
  { name: 'John R.', email: 'john@contoso.com', role: 'SOC Manager', status: 'active' },
  { name: 'Sarah K.', email: 'sarah@contoso.com', role: 'Analyst', status: 'active' },
  { name: 'Mike D.', email: 'mike@contoso.com', role: 'Analyst', status: 'pending' },
];

const GRAPH_SCOPES = ['User.Read.All', 'AuditLog.Read.All', 'Directory.Read.All', 'IdentityRiskEvent.Read.All'];

const ALERT_USAGE = 312;
const ALERT_LIMIT = 10000;

export default function SettingsPage() {
  const [showInvite, setShowInvite] = useState(false);
  const usagePct = Math.round((ALERT_USAGE / ALERT_LIMIT) * 100);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <div className="subtitle">Integrations · billing · webhooks</div>
        </div>
      </header>

      <div className="settings-page">
        {/* Wazuh */}
        <div className="settings-card">
          <div className="head">
            <h3>Wazuh</h3>
            <span className="pill">Connected</span>
          </div>
          <div className="meta">Last ping: 2 min ago · 247 alerts received today</div>
          <div className="copy-field">
            <div className="url">https://phishslayer.tech/api/webhooks/wazuh?token=wz_a3f928c...</div>
            <button className="copy-btn">Copy</button>
          </div>
          <div className="actions">
            <button className="btn">Regenerate token</button>
            <button className="btn ghost">View logs</button>
          </div>
        </div>

        {/* Microsoft Graph */}
        <div className="settings-card">
          <div className="head">
            <h3>Microsoft Graph</h3>
            <span className="pill">Connected</span>
          </div>
          <div className="meta">Tenant: contoso.onmicrosoft.com</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 12px' }}>
            {GRAPH_SCOPES.map(s => (
              <span key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px',
                background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
                borderRadius: 4, color: 'var(--text-secondary)' }}>{s}</span>
            ))}
          </div>
          <div className="actions">
            <button className="btn">Re-authorize</button>
            <button className="btn ghost" style={{ color: '#FCA5A5' }}>Disconnect</button>
          </div>
        </div>

        {/* Billing */}
        <div className="settings-card">
          <div className="head">
            <h3>Polar Billing</h3>
            <span className="pill" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-400)' }}>SOC Pro</span>
          </div>
          <div className="meta">$1,499/mo · Renews June 6, 2026</div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Alert usage this month</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {ALERT_USAGE.toLocaleString()}/{ALERT_LIMIT.toLocaleString()}
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${usagePct}%`, height: '100%', background: 'var(--accent-500)', borderRadius: 999, transition: 'width 600ms ease' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 4 }}>
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
              {TEAM_MEMBERS.length} members
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-tertiary)',
                    padding: '8px 12px', borderBottom: '1px solid var(--bg-border)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM_MEMBERS.map(m => (
                <tr key={m.email}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bg-border)', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: m.status === 'pending' ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #a855f7, var(--accent-500))',
                        display: 'grid', placeItems: 'center',
                        fontSize: 10, fontWeight: 700, color: m.status === 'pending' ? 'var(--text-tertiary)' : 'white',
                        border: m.status === 'pending' ? '1px dashed var(--bg-border)' : 'none',
                      }}>
                        {m.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bg-border)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.email}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bg-border)', fontSize: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 4, letterSpacing: '0.04em',
                      background: m.role === 'SOC Manager' ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                      color: m.role === 'SOC Manager' ? 'var(--accent-400)' : 'var(--text-secondary)',
                      border: `1px solid ${m.role === 'SOC Manager' ? 'rgba(99,102,241,0.3)' : 'var(--bg-border)'}`,
                    }}>{m.role}</span>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bg-border)' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-display)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: m.status === 'active' ? '#86EFAC' : '#FDE047',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: m.status === 'active' ? '#22C55E' : '#EAB308',
                      }} />
                      {m.status === 'pending' ? 'Pending invite' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bg-border)' }}>
                    <button className="btn ghost" style={{ padding: '2px 8px', fontSize: 11 }}>
                      {m.status === 'pending' ? 'Resend' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => setShowInvite(true)}>
              <IPlus size={12} /> Invite member
            </button>
          </div>
        </div>
      </div>

      {showInvite && (
        <div className="modal-backdrop" onClick={() => setShowInvite(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>
              Invite team member
              <button className="btn ghost" style={{ padding: '2px 6px' }} onClick={() => setShowInvite(false)}>
                <IX size={13} />
              </button>
            </h3>
            <div className="field-group">
              <div>
                <label>Email address</label>
                <input type="email" placeholder="colleague@contoso.com"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)', borderRadius: 7,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label>Role</label>
                <select style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--bg-border)', borderRadius: 7,
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                  <option>Analyst</option>
                  <option>SOC Manager</option>
                  <option>Read-only</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn primary" onClick={() => setShowInvite(false)}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
