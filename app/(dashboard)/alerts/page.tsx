'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  IChevRight, IChevDown, ISearch, IPlus,
} from '@/components/ui/icons';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status = 'triaging' | 'escalated' | 'responded' | 'closed' | 'fp' | 'pending';
type BlastRadius = 'user' | 'device' | 'org' | 'tenant';

interface Alert {
  id: string;
  severity: Severity;
  attack: string;
  src_ip: string;
  target: string;
  country: string;
  status: Status;
  confidence: number | null;
  age_seconds: number;
  started_at: string;
  resolved: boolean;
  blast_radius: BlastRadius;
  fp_probability: number;
  proposed_action?: string;
  proposed_action_short?: string;
  side_effects?: string[];
  rollback_steps?: string[];
  recovery_time?: string;
  isNew?: boolean;
}

const SEED_ALERTS: Alert[] = [
  { id: '3f92a1c0', severity: 'critical', attack: 'Credential stuffing', src_ip: '185.220.101.42', target: 'a.harrington@contoso.com', country: '🇷🇺 RU', status: 'triaging', confidence: null, age_seconds: 130, started_at: '12:34:01', resolved: false, blast_radius: 'user', fp_probability: 0.38, proposed_action: 'Revoke all sessions for a.harrington@contoso.com', proposed_action_short: 'sessions.revoke(user)', rollback_steps: ['Re-enable user account if flagged disabled', 'Restore previous Conditional Access policy version', 'Notify user via secondary email contact'], side_effects: ['User logged out of all Microsoft 365 apps', 'Outlook mobile + desktop will require re-auth', 'Active Teams call (if any) will drop'], recovery_time: '~5 min' },
  { id: '8a2bf013', severity: 'high', attack: 'Impossible travel', src_ip: '45.33.32.156', target: 'm.bilic@contoso.com', country: '🇩🇪 DE → 🇧🇷 BR', status: 'escalated', confidence: 0.71, age_seconds: 510, started_at: '12:25:00', resolved: false, blast_radius: 'user', fp_probability: 0.22, proposed_action: 'Block sign-in from 45.33.32.156 + force MFA challenge', proposed_action_short: 'mfa.challenge(user)' },
  { id: 'c01a92e4', severity: 'medium', attack: 'Brute force', src_ip: '192.0.2.135', target: 'svc-payroll@contoso.com', country: '🇨🇳 CN', status: 'responded', confidence: 0.88, age_seconds: 920, started_at: '12:18:15', resolved: false, blast_radius: 'device', fp_probability: 0.08 },
  { id: 'b71e8f24', severity: 'high', attack: 'Suspicious OAuth grant', src_ip: '203.0.113.18', target: 'j.okeefe@contoso.com', country: '🇳🇱 NL', status: 'pending', confidence: null, age_seconds: 22, started_at: '12:35:48', resolved: false, blast_radius: 'org', fp_probability: 0.31, proposed_action: 'Revoke OAuth consent for "InvoiceProBoost" + audit org-wide grants', proposed_action_short: 'oauth.revoke(org)' },
  { id: '4d8c2a91', severity: 'critical', attack: 'Anomalous data exfiltration', src_ip: '198.51.100.221', target: 's.zheng@contoso.com', country: '🇰🇵 KP', status: 'escalated', confidence: 0.94, age_seconds: 1240, started_at: '12:08:30', resolved: false, blast_radius: 'tenant', fp_probability: 0.06, proposed_action: 'Quarantine mailbox + isolate device from corp network', proposed_action_short: 'mailbox.quarantine + device.isolate' },
  { id: 'e2f071b3', severity: 'medium', attack: 'Mailbox rule abuse', src_ip: '203.0.113.74', target: 'r.delacruz@contoso.com', country: '🇻🇳 VN', status: 'responded', confidence: 0.82, age_seconds: 1820, started_at: '11:59:12', resolved: false, blast_radius: 'user', fp_probability: 0.14 },
  { id: '7c19af52', severity: 'low', attack: 'Password spray', src_ip: '94.198.40.7', target: '*.contoso.com (12 users)', country: '🇧🇷 BR', status: 'pending', confidence: null, age_seconds: 4, started_at: '12:36:06', resolved: false, blast_radius: 'org', fp_probability: 0.45 },
  { id: '9af3211c', severity: 'low', attack: 'Tor exit node sign-in', src_ip: '185.220.101.42', target: 'k.osei@contoso.com', country: '🇩🇪 DE', status: 'closed', confidence: 0.91, age_seconds: 2240, started_at: '11:56:22', resolved: true, blast_radius: 'user', fp_probability: 0.07 },
  { id: '5b8d31f9', severity: 'medium', attack: 'Token theft', src_ip: '85.62.10.211', target: 'finance-bot@contoso.com', country: '🇪🇸 ES', status: 'closed', confidence: 0.96, age_seconds: 2810, started_at: '11:46:20', resolved: true, blast_radius: 'device', fp_probability: 0.03 },
  { id: 'a812ee03', severity: 'low', attack: 'Service principal anomaly', src_ip: '198.51.100.6', target: 'sp-graph-sync', country: '—', status: 'fp', confidence: 0.42, age_seconds: 3500, started_at: '11:35:30', resolved: true, blast_radius: 'org', fp_probability: 0.83 },
];

function ageString(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.floor(seconds))}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function confLevel(score: number | null): string {
  if (score == null) return 'empty';
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`sev-badge ${severity}`} aria-label={`Severity ${severity}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  const labelMap: Record<Status, string> = { triaging: 'TRIAGING', escalated: 'ESCALATED', responded: 'RESPONDED', closed: 'CLOSED', fp: 'FALSE POSITIVE', pending: 'PENDING' };
  return (
    <span className={`status-badge ${status}`}>
      {status === 'triaging' && <span className="pulse-dot" />}
      {labelMap[status]}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number | null }) {
  const level = confLevel(score);
  if (score == null) {
    return (
      <span className="conf-bar">
        <span className="track"><span className="fill" style={{ width: 0 }} /></span>
        <span className="num empty">—</span>
      </span>
    );
  }
  return (
    <span className="conf-bar">
      <span className="track"><span className={`fill ${level}`} style={{ width: `${score * 100}%` }} /></span>
      <span className="num">{score.toFixed(2)}</span>
    </span>
  );
}

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = options.find(o => o[0] === value)?.[1] || label;
  const isActive = value !== 'all' && value !== '24h';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`filter-pill ${isActive ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        <span>{label}: {current}</span>
        <IChevDown size={10} style={{ color: 'var(--text-tertiary)' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: 4, minWidth: 160, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {options.map(([val, lab]) => (
            <button key={val} onClick={() => { onChange(val); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 12, background: value === val ? 'var(--bg-hover)' : 'transparent', border: 0, color: value === val ? 'var(--accent-400)' : 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer' }}>
              {lab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, selected, flashing, onClick, resolved }: { alert: Alert; selected: boolean; flashing: boolean; onClick: () => void; resolved?: boolean }) {
  return (
    <tr
      className={['density-comfortable', selected && 'selected', flashing && 'flash', resolved && 'resolved'].filter(Boolean).join(' ')}
      data-severity={alert.severity}
      onClick={onClick}
      role="row"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <td><SeverityBadge severity={alert.severity} /></td>
      <td>
        <div className="attack-cell">
          <span>{alert.attack}</span>
          <span className="target">→ {alert.target}</span>
        </div>
      </td>
      <td className="col-mono">{alert.src_ip}</td>
      <td><StatusBadge status={alert.status} /></td>
      <td><ConfidenceBar score={alert.confidence} /></td>
      <td className="col-mono muted">{alert.country}</td>
      <td className="col-age">{ageString(alert.age_seconds)}</td>
      <td><span className="row-arrow"><IChevRight size={14} /></span></td>
    </tr>
  );
}

function AlertsPageContent() {
  const [alerts, setAlerts] = useState<Alert[]>(SEED_ALERTS);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [expandResolved, setExpandResolved] = useState(false);
  const [filters, setFilters] = useState({ severity: 'all', status: 'all', range: '24h' });
  const [search, setSearch] = useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('alert');

  const supabase = createClient();

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.alerts?.length) setAlerts(d.alerts); })
      .catch(() => {/* keep seed data */});

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, payload => {
        const a = payload.new as Alert;
        if (!a?.id) return;
        setAlerts(prev => {
          const idx = prev.findIndex(x => x.id === a.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = a; return next; }
          return [{ ...a, isNew: true }, ...prev];
        });
        setFlashIds(prev => {
          const next = new Set(prev);
          next.add(a.id);
          setTimeout(() => setFlashIds(p => { const s = new Set(p); s.delete(a.id); return s; }), 700);
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Age ticker
  useEffect(() => {
    const t = setInterval(() => {
      setAlerts(prev => prev.map(a => ({ ...a, age_seconds: a.age_seconds + 1 })));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard nav
  const filtered = alerts.filter(a => {
    if (filters.severity !== 'all' && a.severity !== filters.severity) return false;
    if (filters.status !== 'all' && a.status !== filters.status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.src_ip.includes(q) && !a.target.toLowerCase().includes(q) && !a.attack.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const openAlerts = filtered.filter(a => !a.resolved);
  const resolvedAlerts = filtered.filter(a => a.resolved);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!openAlerts.length) return;
      if (e.key === 'Escape') { router.push('/alerts'); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = openAlerts.findIndex(a => a.id === selectedId);
        const next = e.key === 'ArrowDown'
          ? openAlerts[Math.min(idx + 1, openAlerts.length - 1)]
          : openAlerts[Math.max(idx - 1, 0)];
        if (next) router.push(`/alerts?alert=${next.id}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openAlerts, selectedId]);

  const counts = {
    open: alerts.filter(a => !a.resolved).length,
    aiResolved: alerts.filter(a => a.resolved && a.status === 'closed').length,
    pending: alerts.filter(a => a.status === 'pending' || a.status === 'escalated').length,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="page-header">
        <div>
          <h1>Alerts</h1>
          <div className="subtitle">
            <span style={{ color: 'var(--text-primary)' }}>{counts.open} open</span>
            <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>·</span>
            <span>{counts.aiResolved} AI resolved</span>
            <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>·</span>
            <span>{counts.pending} pending review</span>
          </div>
        </div>
        <button className="btn primary"><IPlus size={13} /> Manual alert</button>
      </header>

      <div className="filter-bar" role="toolbar" aria-label="Alert filters">
        <FilterDropdown
          label="Severity"
          value={filters.severity}
          options={[['all','All'],['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']]}
          onChange={v => setFilters(f => ({ ...f, severity: v }))}
        />
        <FilterDropdown
          label="Status"
          value={filters.status}
          options={[['all','All'],['triaging','Triaging'],['escalated','Escalated'],['responded','Responded'],['pending','Pending']]}
          onChange={v => setFilters(f => ({ ...f, status: v }))}
        />
        <FilterDropdown
          label="Time"
          value={filters.range}
          options={[['1h','Last hour'],['24h','Last 24h'],['7d','Last 7 days']]}
          onChange={v => setFilters(f => ({ ...f, range: v }))}
        />
        <div className="search-input">
          <ISearch size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search IPs, users, attack types..."
            aria-label="Search alerts"
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="alert-table" role="grid">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Sev</th>
              <th>Attack type</th>
              <th>Source IP</th>
              <th>Status</th>
              <th>Conf</th>
              <th>Geo</th>
              <th style={{ width: 60 }}>Age</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {openAlerts.map(a => (
              <AlertRow
                key={a.id}
                alert={a}
                selected={a.id === selectedId}
                flashing={flashIds.has(a.id)}
                onClick={() => router.push(a.id === selectedId ? '/alerts' : `/alerts?alert=${a.id}`)}
              />
            ))}
            {openAlerts.length === 0 && (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="ico">⌖</div>
                  <h3>No alerts match these filters</h3>
                  <p>Adjust filters or wait for new events</p>
                </div>
              </td></tr>
            )}

            {resolvedAlerts.length > 0 && (
              <tr className={`resolved-group-row ${expandResolved ? 'expanded' : ''}`} onClick={() => setExpandResolved(e => !e)} style={{ cursor: 'pointer' }}>
                <td colSpan={8}>
                  <span className="chev"><IChevRight size={11} /></span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>AI Resolved ({resolvedAlerts.length})</span>
                  <span style={{ marginLeft: 10 }}>
                    {expandResolved ? 'Showing auto-closed alerts' : 'Click to expand auto-closed alerts'}
                  </span>
                </td>
              </tr>
            )}
            {expandResolved && resolvedAlerts.map(a => (
              <AlertRow
                key={a.id}
                alert={a}
                selected={a.id === selectedId}
                flashing={false}
                onClick={() => router.push(a.id === selectedId ? '/alerts' : `/alerts?alert=${a.id}`)}
                resolved
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Keyboard hint */}
      <div style={{ padding: '8px 32px', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--bg-border)', background: 'var(--bg-base)' }}>
        ↑↓ navigate · Enter open · Esc close · ?/K shortcuts
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading alerts…</div>}>
      <AlertsPageContent />
    </Suspense>
  );
}
