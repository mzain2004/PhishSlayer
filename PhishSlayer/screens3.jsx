// screens3.jsx — Enhanced Consequence Modal, Onboarding, Settings

// ── CONSEQUENCE MODAL (overlay) ──────────────────────────────────────────────
function ConsequenceModal({ alert, open, onApprove, onReject, onClose }) {
  const [approved1, setApproved1] = React.useState(false);
  const [approved2, setApproved2] = React.useState(false);
  const [showRollback, setShowRollback] = React.useState(true);

  React.useEffect(() => {
    setApproved1(false); setApproved2(false); setShowRollback(true);
  }, [alert?.id, open]);

  React.useEffect(() => {
    if (!open) return;
    const fn = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open || !alert) return null;

  const handleApprove1 = () => {
    setApproved1(true);
  };
  const handleApprove2 = () => {
    setApproved2(true);
    setTimeout(() => onApprove?.(alert), 600);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'fade-in 200ms ease',
    }} onClick={onClose}>
      <div className="cq-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cq-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="cq-icon">
              <IShield size={18} />
            </div>
            <div>
              <h2 className="cq-title">Action requires approval</h2>
              <div className="cq-sub">L2 agent needs human confirmation before executing</div>
            </div>
          </div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            <IX size={14} />
          </button>
        </div>

        {/* Action */}
        <div className="cq-action-box">
          <div className="cq-action-label">Proposed action</div>
          <div className="cq-action-code">
            <ILock size={12} /> Disable account: <span className="hl">a.harrington@contoso.com</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <SeverityBadge severity="critical" />
            <ConfidenceBar score={0.94} width={100} />
            <span style={{ fontSize: 11, color: '#86EFAC', fontFamily: 'var(--font-display)', fontWeight: 600 }}>High confidence</span>
          </div>
        </div>

        {/* Blast radius diagram */}
        <div className="cq-blast-section">
          <div className="cq-section-label">Blast radius</div>
          <div className="cq-blast-visual">
            <svg viewBox="0 0 320 320" style={{ width: 240, height: 240, display: 'block', margin: '0 auto' }}>
              <defs>
                <radialGradient id="cq-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(99,102,241,0.06)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx="160" cy="160" r="155" fill="url(#cq-glow)" />

              {/* Ring 3 — Org-wide (outer) */}
              <circle cx="160" cy="160" r="140" fill="rgba(239,68,68,0.05)"
                      stroke="#EF4444" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 4" />
              {/* Ring 2 — Department */}
              <circle cx="160" cy="160" r="100" fill="rgba(249,115,22,0.08)"
                      stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.5" />
              {/* Ring 1 — Systems */}
              <circle cx="160" cy="160" r="60" fill="rgba(234,179,8,0.1)"
                      stroke="#EAB308" strokeWidth="1.5" strokeOpacity="0.7" />
              {/* Center — User */}
              <circle cx="160" cy="160" r="20" fill="rgba(34,197,94,0.2)"
                      stroke="#22C55E" strokeWidth="2" />
              <circle cx="160" cy="160" r="5" fill="#22C55E" />

              {/* Labels */}
              <text x="160" y="112" textAnchor="middle" fontSize="10" fontWeight="700"
                    fill="#FDE047" fontFamily="Space Grotesk,Inter,sans-serif" letterSpacing="0.5">3 ENDPOINTS</text>
              <text x="160" y="72" textAnchor="middle" fontSize="10" fontWeight="700"
                    fill="#FDBA74" fontFamily="Space Grotesk,Inter,sans-serif" letterSpacing="0.5">FINANCE · 12 USERS</text>
              <text x="160" y="32" textAnchor="middle" fontSize="9" fontWeight="600"
                    fill="rgba(252,165,165,0.6)" fontFamily="Space Grotesk,Inter,sans-serif" letterSpacing="0.5">ORG-WIDE (READ-ONLY)</text>
              <text x="160" y="172" textAnchor="middle" fontSize="9" fontWeight="700"
                    fill="#86EFAC" fontFamily="Space Grotesk,Inter,sans-serif" letterSpacing="1">1 ACCOUNT</text>
            </svg>
          </div>
          <div className="cq-blast-legend">
            <div className="cq-legend-item">
              <span className="cq-dot" style={{ background: '#22C55E' }} />
              <span>Affected user</span>
              <span className="cq-count">1 account</span>
            </div>
            <div className="cq-legend-item">
              <span className="cq-dot" style={{ background: '#EAB308' }} />
              <span>Affected systems</span>
              <span className="cq-count">3 endpoints</span>
            </div>
            <div className="cq-legend-item">
              <span className="cq-dot" style={{ background: '#F97316' }} />
              <span>Department blast</span>
              <span className="cq-count">Finance, 12 users</span>
            </div>
            <div className="cq-legend-item">
              <span className="cq-dot" style={{ background: 'rgba(239,68,68,0.5)' }} />
              <span>Org-wide impact</span>
              <span className="cq-count" style={{ color: 'var(--text-tertiary)' }}>monitoring only</span>
            </div>
          </div>
        </div>

        {/* Rollback */}
        <div className="cq-rollback">
          <button className="cq-section-label" onClick={() => setShowRollback(s => !s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}>
            <IChevRight size={10} style={{ transform: showRollback ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
            Rollback steps
          </button>
          {showRollback && (
            <ol className="cq-rollback-list">
              <li><span className="step-num">1</span> Re-enable account via Graph API <span className="mono">graph.users.enable()</span></li>
              <li><span className="step-num">2</span> Restore MFA configuration <span className="mono">mfa.restore(backup)</span></li>
              <li><span className="step-num">3</span> Notify user via secondary email contact</li>
            </ol>
          )}
        </div>

        {/* Approval */}
        <div className="cq-approval">
          <div className="cq-two-person">
            <ILock size={12} /> This action requires <strong>2 approvals</strong> from different analysts
          </div>
          <div className="cq-approval-grid">
            <button
              className={`cq-approve-btn ${approved1 ? 'done' : ''}`}
              onClick={handleApprove1}
              disabled={approved1}
            >
              {approved1
                ? <><ICheck size={14} /> Approved — John R. (you)</>
                : <><ICheck size={14} /> Approve — John R. (you)</>}
            </button>
            <button
              className={`cq-approve-btn second ${approved2 ? 'done' : ''}`}
              onClick={handleApprove2}
              disabled={!approved1 || approved2}
            >
              {approved2
                ? <><ICheck size={14} /> Approved — Sarah K.</>
                : approved1
                  ? <><ICheck size={14} /> Approve — Sarah K.</>
                  : <><ILock size={12} /> Awaiting first approval</>}
            </button>
          </div>
          <button className="cq-reject-btn" onClick={onReject} disabled={approved2}>
            <IX size={13} /> Reject action
          </button>
          {approved1 && approved2 && (
            <div className="cq-exec-status">
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse-ring 1.5s ease infinite' }} />
              Executing action...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ENHANCED ONBOARDING ──────────────────────────────────────────────────────
function OnboardingScreenV2({ onComplete }) {
  const [step, setStep] = React.useState(1);
  const [testing, setTesting] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [graphConnected, setGraphConnected] = React.useState(false);

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => { setTesting(false); setConnected(true); }, 2200);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const steps = [
    { num: 1, label: 'Connect Wazuh', done: step > 1 },
    { num: 2, label: 'Connect Microsoft 365', done: step > 2 },
    { num: 3, label: 'Ready', done: false },
  ];

  return (
    <div className="ob2-wrap">
      {/* Minimal topbar */}
      <header className="ob2-topbar">
        <div className="brand">
          <div className="logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 12 L11 14 L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="name">PhishSlayer</span>
          <span className="ver">v0.6.2</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="ob2-steps">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={`ob2-step ${step === s.num ? 'active' : ''} ${s.done ? 'done' : ''}`}>
              <div className="ob2-step-num">
                {s.done ? <ICheck size={12} /> : s.num}
              </div>
              <span className="ob2-step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ob2-step-line ${s.done ? 'done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Card */}
      <div className="ob2-card">
        {step === 1 && (
          <>
            <h2 className="ob2-title">Connect your Wazuh instance</h2>
            <p className="ob2-sub">Paste this webhook URL into your Wazuh manager configuration</p>

            <div className="ob2-url-box">
              <div className="ob2-url-label">Webhook endpoint</div>
              <div className="ob2-url-field">
                <code>https://phishslayer.tech/api/webhooks/wazuh?token=wz_a3f928c...</code>
                <button className={`ob2-copy ${copied ? 'done' : ''}`} onClick={handleCopy}>
                  {copied ? <><ICheck size={12} /> Copied</> : <><ICopy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            <div className="ob2-divider">
              <span>Then send a test alert to verify</span>
            </div>

            <button className={`btn ${testing ? '' : 'primary'}`}
                    style={{ width: '100%', justifyContent: 'center', padding: 12 }}
                    onClick={handleTest}
                    disabled={testing || connected}>
              {testing ? 'Sending test alert...' : connected ? '✓ Test received' : 'Send test alert'}
            </button>

            <div className={`ob2-status ${testing ? 'waiting' : connected ? 'success' : 'idle'}`}>
              <span className="ob2-status-dot" />
              {testing
                ? 'Waiting for first alert...'
                : connected
                  ? 'Connected — Wazuh webhook verified'
                  : 'Waiting for first alert...'}
            </div>

            <div className="ob2-footer">
              <button className="btn ghost" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                Skip for now
              </button>
              <button className="btn primary" disabled={!connected} onClick={() => setStep(2)}>
                Continue <IArrowRight size={13} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="ob2-title">Connect Microsoft 365</h2>
            <p className="ob2-sub">Enables identity anomaly detection, sign-in log analysis, and L2 remediation actions via Microsoft Graph.</p>

            <div className="ob2-perms">
              <div className="ob2-perm-label">Required permissions</div>
              <div className="ob2-perm-list">
                {['User.Read.All', 'AuditLog.Read.All', 'Directory.Read.All', 'IdentityRiskEvent.Read.All'].map(p => (
                  <span key={p} className="ob2-perm">{p}</span>
                ))}
              </div>
            </div>

            <button className="btn primary"
                    style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14 }}
                    onClick={() => { setGraphConnected(true); setTimeout(() => setStep(3), 600); }}>
              {graphConnected
                ? <><ICheck size={14} /> Connected</>
                : <>Connect Microsoft 365 <IExternal size={13} /></>}
            </button>

            <div className="ob2-or">
              <div className="ob2-or-line" />
              <span>OR</span>
              <div className="ob2-or-line" />
            </div>

            <button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setStep(3)}>
              Skip Microsoft Graph for now <IArrowRight size={13} />
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="ob2-title">You're ready</h2>
            <p className="ob2-sub">PhishSlayer is now active and monitoring your infrastructure.</p>

            <div className="ob2-summary">
              <SummaryRow icon={<ICheck size={13} />} label="Wazuh" value="Connected" ok />
              <SummaryRow icon={graphConnected ? <ICheck size={13} /> : <IX size={13} />}
                          label="Microsoft 365" value={graphConnected ? 'Connected' : 'Skipped'}
                          ok={graphConnected} muted={!graphConnected} />
              <SummaryRow label="Plan" value="SOC Pro · $1,499/mo" />
              <SummaryRow label="Agents" value="L1 + L2 + L3 active" ok />
            </div>

            <button className="btn primary"
                    style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14, marginTop: 8 }}
                    onClick={onComplete}>
              Go to dashboard <IArrowRight size={14} />
            </button>
          </>
        )}
      </div>

      <div className="ob2-trust">
        <ILock size={10} /> SOC 2 Type II certified · AES-256 encryption at rest · EU data residency available
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value, ok, muted }) {
  return (
    <div className="ob2-sum-row">
      <span className="ob2-sum-icon" style={{ color: ok ? '#86EFAC' : muted ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
        {icon}
      </span>
      <span className="ob2-sum-label">{label}</span>
      <span className="ob2-sum-value" style={{ color: ok ? '#86EFAC' : muted ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

// ── ENHANCED SETTINGS ────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { name: 'John R.', email: 'john@contoso.com', role: 'SOC Manager', status: 'active' },
  { name: 'Sarah K.', email: 'sarah@contoso.com', role: 'Analyst', status: 'active' },
  { name: 'Mike D.', email: 'mike@contoso.com', role: 'Analyst', status: 'pending' },
];

function SettingsScreenV2() {
  const [showInvite, setShowInvite] = React.useState(false);
  const alertUsage = 312;
  const alertLimit = 10000;
  const usagePct = Math.round((alertUsage / alertLimit) * 100);

  return (
    <div>
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

        {/* Graph */}
        <div className="settings-card">
          <div className="head">
            <h3>Microsoft Graph</h3>
            <span className="pill">Connected</span>
          </div>
          <div className="meta">Tenant: contoso.onmicrosoft.com</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 12px' }}>
            {['User.Read.All', 'AuditLog.Read.All', 'Directory.Read.All', 'IdentityRiskEvent.Read.All'].map(s => (
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
                {alertUsage.toLocaleString()}/{alertLimit.toLocaleString()}
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
                        background: m.status === 'pending' ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--amethyst-500), var(--accent-500))',
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

Object.assign(window, {
  ConsequenceModal, OnboardingScreenV2, SettingsScreenV2,
});
