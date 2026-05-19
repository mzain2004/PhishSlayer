'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useRef, useState } from 'react';
import { IChevDown, IChevRight, ICheck, ICrosshair, IDownload, IPlus, ISearch, IX } from '@/components/ui/icons';
import { TLPBadge, TLPSelector, type TLPLevel } from '@/components/ui/TLPBadge';

interface IOC {
  id: string;
  indicator: string;
  type: string;
  confidence: number;
  severity: string;
  first_seen: string;
  last_seen: string;
  sources: string[];
  hits: number;
  raw: Record<string, string>;
  related_alerts: string[];
  tags: string[];
  tlp_level: string;
}

function mapApiIoc(raw: Record<string, unknown>): IOC {
  const conf = raw.confidence;
  const confidence = typeof conf === 'number'
    ? (conf > 1 ? conf / 100 : conf)
    : 0;
  const type = String(raw.type ?? 'IP');
  const sev = typeof raw.severity === 'string' ? raw.severity : 'medium';
  return {
    id: String(raw.id ?? raw._id ?? ''),
    indicator: String(raw.indicator ?? raw.value ?? '—'),
    type,
    confidence,
    severity: sev,
    first_seen: typeof raw.firstSeen === 'string' ? raw.firstSeen : (typeof raw.first_seen === 'string' ? raw.first_seen : '—'),
    last_seen: typeof raw.lastSeen === 'string' ? raw.lastSeen : (typeof raw.last_seen === 'string' ? raw.last_seen : '—'),
    sources: Array.isArray(raw.sources) ? (raw.sources as string[]) : [],
    hits: typeof raw.hits === 'number' ? raw.hits : 0,
    raw: (typeof raw.raw === 'object' && raw.raw !== null ? raw.raw : {}) as Record<string, string>,
    related_alerts: Array.isArray(raw.related_alerts) ? (raw.related_alerts as string[]) : [],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    tlp_level: typeof raw.tlp_level === 'string' ? raw.tlp_level : 'amber',
  };
}

function confLevel(score: number) {
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

function SeverityBadge({ severity }: { severity: string }) {
  return <span className={`sev-badge ${severity}`}>{severity}</span>;
}

function ConfidenceBar({ score }: { score: number }) {
  const level = confLevel(score);
  return (
    <div className="conf-bar">
      <div className={`conf-fill ${level}`} style={{ width: `${score * 100}%` }} />
      <span className="conf-val">{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

function IOCFilterPill({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const cur = options.find(o => o[0] === value)?.[1] || label;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`filter-pill ${value !== 'all' ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        {label}: <strong style={{ marginLeft: 4 }}>{cur}</strong>
        <IChevDown size={10} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30, minWidth: 160,
          background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 6,
          padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {options.map(([val, lab]) => (
            <button key={val} onClick={() => { onChange(val); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                fontSize: 12, background: value === val ? 'var(--bg-hover)' : 'transparent',
                border: 0, color: value === val ? 'var(--accent-400)' : 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer' }}>
              {lab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IOCExpanded({ ioc }: { ioc: IOC }) {
  return (
    <div className="ioc-expand-body">
      <div className="expand-section">
        <h4>Raw Intel</h4>
        <div className="vals">
          {Object.entries(ioc.raw).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: 'var(--text-tertiary)' }}>{k}:</span>{' '}
              <span className="hl">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="expand-section">
        <h4>Tags</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {ioc.tags.map(t => (
            <span key={t} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 8px',
              background: 'rgba(99,102,241,0.1)', color: 'var(--accent-400)',
              border: '1px solid rgba(99,102,241,0.25)', borderRadius: 4 }}>{t}</span>
          ))}
        </div>
        <h4>Related alerts</h4>
        <div className="vals">
          {ioc.related_alerts.map(a => (
            <div key={a} className="hl">{a}</div>
          ))}
        </div>
      </div>
      <div className="expand-section">
        <h4>Actions</h4>
        <div className="ioc-row-actions">
          <button className="btn"><ICrosshair size={12} /> Hunt</button>
          <button className="btn"><ICheck size={12} /> Whitelist</button>
          <button className="btn"><IDownload size={12} /> Export</button>
        </div>
      </div>
    </div>
  );
}

export default function IOCsPage() {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSev, setFilterSev] = useState('all');
  const [filterConf, setFilterConf] = useState('all');
  const [search, setSearch] = useState('');

  // Add IOC modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addType, setAddType] = useState('IP');
  const [addTlp, setAddTlp] = useState<TLPLevel>('amber');
  const [addSubmitting, setAddSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/tip/iocs')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const items = Array.isArray(d) ? d : Array.isArray(d?.iocs) ? d.iocs : Array.isArray(d?.data) ? d.data : [];
        setIocs(items.map(mapApiIoc));
      })
      .catch(() => { /* leave empty */ })
      .finally(() => setLoading(false));
  }, []);

  const filtered = iocs.filter(ioc => {
    if (filterType !== 'all' && ioc.type.toLowerCase() !== filterType) return false;
    if (filterSev !== 'all' && ioc.severity !== filterSev) return false;
    if (filterConf === 'high' && ioc.confidence < 0.85) return false;
    if (filterConf === 'medium' && (ioc.confidence < 0.6 || ioc.confidence >= 0.85)) return false;
    if (filterConf === 'low' && ioc.confidence >= 0.6) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!ioc.indicator.toLowerCase().includes(q) && !ioc.tags.some(t => t.includes(q))) return false;
    }
    return true;
  });

  const counts = {
    ip: iocs.filter(i => i.type === 'IP').length,
    domain: iocs.filter(i => i.type === 'Domain').length,
    hash: iocs.filter(i => i.type === 'Hash').length,
    email: iocs.filter(i => i.type === 'Email').length,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="page-header">
        <div>
          <h1>IOCs</h1>
          <div className="subtitle">
            <span style={{ color: 'var(--text-primary)' }}>{iocs.length} indicators</span>
            {' · '}
            <span>{counts.ip} IPs · {counts.domain} domains · {counts.hash} hashes · {counts.email} emails</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><IDownload size={13} /> Export</button>
          <button className="btn primary" onClick={() => { setShowAddModal(true); setAddValue(''); setAddType('IP'); setAddTlp('amber'); }}><IPlus size={13} /> Add IOC</button>
        </div>
      </header>

      <div className="filter-bar">
        <IOCFilterPill label="Type" value={filterType}
          options={[['all','All'],['ip','IP'],['domain','Domain'],['hash','Hash'],['email','Email']]}
          onChange={setFilterType} />
        <IOCFilterPill label="Severity" value={filterSev}
          options={[['all','All'],['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']]}
          onChange={setFilterSev} />
        <IOCFilterPill label="Confidence" value={filterConf}
          options={[['all','All'],['high','High ≥0.85'],['medium','Medium'],['low','Low <0.60']]}
          onChange={setFilterConf} />
        <div className="search-input">
          <ISearch size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search indicator, tag..." />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="alert-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Type</th>
              <th>Indicator</th>
              <th style={{ width: 90 }}>Severity</th>
              <th style={{ width: 90 }}>TLP</th>
              <th style={{ width: 130 }}>Confidence</th>
              <th>Sources</th>
              <th style={{ width: 90 }}>Hits</th>
              <th>First seen</th>
              <th>Last seen</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <div className="ico">⌖</div>
                  <h3>{iocs.length === 0 ? 'No IOCs tracked yet' : 'No IOCs match these filters'}</h3>
                  <p>{iocs.length === 0 ? 'Indicators discovered by hunts and integrations will appear here.' : 'Adjust the filters above to broaden results.'}</p>
                </div>
              </td></tr>
            )}
            {loading && filtered.length === 0 && (
              <tr><td colSpan={10}><div className="empty-state"><p>Loading…</p></div></td></tr>
            )}
            {filtered.map(ioc => (
              <>
                <tr
                  key={ioc.id}
                  data-severity={ioc.severity}
                  className="density-comfortable"
                  onClick={() => setExpandedId(expandedId === ioc.id ? null : ioc.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td><span className="ioc-type">{ioc.type}</span></td>
                  <td className="col-mono" style={{ color: 'var(--accent-400)' }}>{ioc.indicator}</td>
                  <td><SeverityBadge severity={ioc.severity} /></td>
                  <td><TLPBadge level={(ioc.tlp_level as TLPLevel) ?? 'amber'} size="sm" /></td>
                  <td><ConfidenceBar score={ioc.confidence} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ioc.sources.map(s => (
                        <span key={s} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px',
                          background: 'var(--bg-elevated)', borderRadius: 3, color: 'var(--text-secondary)' }}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: ioc.hits > 5 ? '#FCA5A5' : 'var(--text-primary)', fontWeight: 600 }}>{ioc.hits}</td>
                  <td className="col-age" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{ioc.first_seen}</td>
                  <td className="col-age" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{ioc.last_seen}</td>
                  <td>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 11, transition: 'transform 150ms',
                      display: 'inline-block', transform: expandedId === ioc.id ? 'rotate(90deg)' : 'none' }}>
                      <IChevRight size={12} />
                    </span>
                  </td>
                </tr>
                {expandedId === ioc.id && (
                  <tr key={`${ioc.id}-exp`}>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <IOCExpanded ioc={ioc} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>
              Add IOC
              <button className="btn ghost" style={{ padding: '2px 6px' }} onClick={() => setShowAddModal(false)}>
                <IX size={13} />
              </button>
            </h3>
            <div className="field-group">
              <div>
                <label>Indicator value</label>
                <input
                  value={addValue}
                  onChange={e => setAddValue(e.target.value)}
                  placeholder="IP, domain, hash, URL…"
                  autoFocus
                />
              </div>
              <div>
                <label>Type</label>
                <select value={addType} onChange={e => setAddType(e.target.value)}>
                  <option value="IP">IP</option>
                  <option value="Domain">Domain</option>
                  <option value="Hash">Hash</option>
                  <option value="URL">URL</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <TLPSelector value={addTlp} onChange={setAddTlp} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button
                className="btn primary"
                disabled={!addValue.trim() || addSubmitting}
                onClick={async () => {
                  setAddSubmitting(true);
                  try {
                    const res = await fetch('/api/tip/iocs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ value: addValue.trim(), iocType: addType, tlp_level: addTlp }),
                    });
                    if (res.ok) {
                      setShowAddModal(false);
                      const d = await fetch('/api/tip/iocs').then(r => r.ok ? r.json() : null);
                      const items = Array.isArray(d) ? d : Array.isArray(d?.iocs) ? d.iocs : Array.isArray(d?.data) ? d.data : [];
                      setIocs(items.map(mapApiIoc));
                    }
                  } finally {
                    setAddSubmitting(false);
                  }
                }}
              >
                {addSubmitting ? 'Adding…' : 'Add IOC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
