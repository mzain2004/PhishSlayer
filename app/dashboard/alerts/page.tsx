'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  IChevRight, IChevDown, ISearch, IPlus,
} from '@/components/ui/icons';
import { TLPBadge, type TLPLevel } from '@/components/ui/TLPBadge';

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
  tlp_level?: string;
  proposed_action?: string;
  proposed_action_short?: string;
  side_effects?: string[];
  rollback_steps?: string[];
  recovery_time?: string;
  isNew?: boolean;
}

function mapApiAlert(raw: Record<string, unknown>): Alert {
  const sev = String(raw.severity ?? 'medium').toLowerCase() as Severity;
  const status = String(raw.status ?? 'pending').toLowerCase() as Status;
  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString();
  const ageRaw = raw.triage_age_seconds;
  const age = typeof ageRaw === 'number'
    ? ageRaw
    : Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const startedAt = createdAt.slice(11, 19);
  return {
    id: String(raw.id ?? ''),
    severity: (['critical', 'high', 'medium', 'low'] as Severity[]).includes(sev) ? sev : 'medium',
    attack: typeof raw.source === 'string' ? raw.source : 'Alert',
    src_ip: typeof raw.src_ip === 'string' ? raw.src_ip : '—',
    target: typeof raw.target === 'string' ? raw.target : '—',
    country: typeof raw.country === 'string' ? raw.country : '—',
    status: (['triaging', 'escalated', 'responded', 'closed', 'fp', 'pending'] as Status[]).includes(status) ? status : 'pending',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    age_seconds: age,
    started_at: startedAt,
    resolved: status === 'closed' || status === 'fp' || Boolean(raw.acknowledged_at),
    blast_radius: 'user',
    fp_probability: typeof raw.fp_probability === 'number' ? raw.fp_probability : 0,
    tlp_level: typeof raw.tlp_level === 'string' ? raw.tlp_level : undefined,
  };
}

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
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <SeverityBadge severity={alert.severity} />
          <TLPBadge level={(alert.tlp_level as TLPLevel) ?? 'amber'} size="sm" />
        </div>
      </td>
      <td>
        <div className="attack-cell">
          <span>{alert.attack}</span>
          <span className="target">→ {alert.target}</span>
        </div>
      </td>
      <td className="col-mono">{alert.src_ip}</td>
      <td><StatusBadge status={alert.status} /></td>
      <td className="hidden md:table-cell"><ConfidenceBar score={alert.confidence} /></td>
      <td className="col-mono muted hidden md:table-cell">{alert.country}</td>
      <td className="col-age">{ageString(alert.age_seconds)}</td>
      <td><span className="row-arrow"><IChevRight size={14} /></span></td>
    </tr>
  );
}

function AlertCard({ alert, selected, flashing, onClick, resolved }: { alert: Alert; selected: boolean; flashing: boolean; onClick: () => void; resolved?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      style={{
        display: 'block',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        background: selected ? 'var(--bg-hover)' : 'var(--bg-surface)',
        border: `1px solid ${selected ? 'var(--accent-500)' : 'var(--bg-border)'}`,
        opacity: resolved ? 0.6 : 1,
        transition: 'background 150ms, border-color 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <SeverityBadge severity={alert.severity} />
        <TLPBadge level={(alert.tlp_level as TLPLevel) ?? 'amber'} size="sm" />
        <StatusBadge status={alert.status} />
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          {ageString(alert.age_seconds)}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
        {alert.attack}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
        → {alert.target}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
        {alert.src_ip}{flashing ? ' · NEW' : ''}
      </div>
    </button>
  );
}

function AlertsPageContent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
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
      .then(d => {
        const items = Array.isArray(d?.data) ? d.data : Array.isArray(d?.alerts) ? d.alerts : [];
        setAlerts(items.map(mapApiAlert));
      })
      .catch(() => { /* leave empty; empty-state will render */ })
      .finally(() => setLoading(false));

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, payload => {
        const raw = payload.new as Record<string, unknown>;
        if (!raw?.id) return;
        const a = mapApiAlert(raw);
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
        {/* Desktop / tablet: table */}
        <div className="hidden md:block">
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
              {openAlerts.length === 0 && !loading && (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="ico">⌖</div>
                    <h3>{alerts.length === 0 ? 'No alerts yet' : 'No alerts match these filters'}</h3>
                    <p>{alerts.length === 0 ? 'Wazuh will send alerts here once connected.' : 'Adjust filters or wait for new events'}</p>
                  </div>
                </td></tr>
              )}
              {loading && openAlerts.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><p>Loading…</p></div></td></tr>
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

        {/* Mobile: card list */}
        <div className="md:hidden" style={{ padding: '8px 12px' }}>
          {openAlerts.map(a => (
            <AlertCard
              key={a.id}
              alert={a}
              selected={a.id === selectedId}
              flashing={flashIds.has(a.id)}
              onClick={() => router.push(a.id === selectedId ? '/alerts' : `/alerts?alert=${a.id}`)}
            />
          ))}
          {openAlerts.length === 0 && !loading && (
            <div className="empty-state">
              <div className="ico">⌖</div>
              <h3>{alerts.length === 0 ? 'No alerts yet' : 'No alerts match these filters'}</h3>
              <p>{alerts.length === 0 ? 'Wazuh will send alerts here once connected.' : 'Adjust filters or wait for new events'}</p>
            </div>
          )}
          {loading && openAlerts.length === 0 && (
            <div className="empty-state"><p>Loading…</p></div>
          )}
          {resolvedAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setExpandResolved(e => !e)}
              className="w-full text-left"
              style={{
                marginTop: 8,
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>AI Resolved ({resolvedAlerts.length})</span>
              <span style={{ marginLeft: 8 }}>
                {expandResolved ? '— hide' : '— tap to show'}
              </span>
            </button>
          )}
          {expandResolved && resolvedAlerts.map(a => (
            <AlertCard
              key={a.id}
              alert={a}
              selected={a.id === selectedId}
              flashing={false}
              onClick={() => router.push(a.id === selectedId ? '/alerts' : `/alerts?alert=${a.id}`)}
              resolved
            />
          ))}
        </div>
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
