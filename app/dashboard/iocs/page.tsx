'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useRef, useState } from 'react';
import { IChevDown, IChevRight, ICheck, ICrosshair, IDownload, IPlus, ISearch } from '@/components/ui/icons';

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
}

const IOC_DATA: IOC[] = [
  { id: 'ioc-001', indicator: '185.220.101.42', type: 'IP', confidence: 0.94, severity: 'critical',
    first_seen: '2026-05-08 04:12', last_seen: '2026-05-10 12:31',
    sources: ['VirusTotal','AbuseIPDB','Shodan'], hits: 8,
    raw: { vt_score: '47/72', abuse_conf: '89%', country: 'RU', asn: 'AS60781 LeaseWeb' },
    related_alerts: ['3f92a1c0','4d8c2a91'], tags: ['Tor exit','APT-41','cred-stuffing'] },
  { id: 'ioc-002', indicator: 'kit-2024.tld', type: 'Domain', confidence: 0.91, severity: 'critical',
    first_seen: '2026-05-07 18:40', last_seen: '2026-05-10 11:18',
    sources: ['URLScan','PhishTank','GreyNoise'], hits: 5,
    raw: { urlscan: 'phishing-kit fingerprint match', registrar: 'Namesilo', created: '2026-04-29' },
    related_alerts: ['3f92a1c0'], tags: ['phishing-kit','credential-harvest'] },
  { id: 'ioc-003', indicator: '3f924e51c0a8b...d792', type: 'Hash', confidence: 0.96, severity: 'critical',
    first_seen: '2026-05-06 09:01', last_seen: '2026-05-10 08:44',
    sources: ['VirusTotal','MalwareBazaar'], hits: 11,
    raw: { vt_score: '62/72', family: 'AgentTesla', packer: 'UPX' },
    related_alerts: ['4d8c2a91','3f92a1c0'], tags: ['infostealer','AgentTesla'] },
  { id: 'ioc-004', indicator: '45.33.32.156', type: 'IP', confidence: 0.71, severity: 'high',
    first_seen: '2026-05-09 22:14', last_seen: '2026-05-10 12:29',
    sources: ['AbuseIPDB','Shodan'], hits: 3,
    raw: { abuse_conf: '62%', open_ports: '22,80,443', country: 'DE' },
    related_alerts: ['8a2bf013'], tags: ['brute-force','scanning'] },
  { id: 'ioc-005', indicator: 'associated-domain.cc', type: 'Domain', confidence: 0.88, severity: 'high',
    first_seen: '2026-05-08 11:22', last_seen: '2026-05-10 10:05',
    sources: ['URLScan','WHOIS'], hits: 5,
    raw: { redirect_chain: '→198.51.100.4→kit-2024.tld', registrar: 'GoDaddy', created: '2026-04-21' },
    related_alerts: ['3f92a1c0'], tags: ['redirect','phishing'] },
  { id: 'ioc-006', indicator: '198.51.100.4', type: 'IP', confidence: 0.78, severity: 'high',
    first_seen: '2026-05-08 13:00', last_seen: '2026-05-10 09:18',
    sources: ['GreyNoise','Shodan'], hits: 3,
    raw: { greyNoise: 'internet scanner', open_ports: '80,443', country: 'NL' },
    related_alerts: ['3f92a1c0'], tags: ['scanner','relay'] },
  { id: 'ioc-007', indicator: 'j.okeefe@contoso.com', type: 'Email', confidence: 0.61, severity: 'medium',
    first_seen: '2026-05-10 11:30', last_seen: '2026-05-10 12:05',
    sources: ['HIBP','Internal SIEM'], hits: 2,
    raw: { hibp_breaches: 'LinkedIn2021,Adobe2022', internal: 'OAuth anomaly' },
    related_alerts: ['b71e8f24'], tags: ['compromised-creds','OAuth'] },
];

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
  const [iocs, setIocs] = useState<IOC[]>(IOC_DATA);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSev, setFilterSev] = useState('all');
  const [filterConf, setFilterConf] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/iocs')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.iocs?.length) setIocs(d.iocs); })
      .catch(() => {});
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
          <button className="btn primary"><IPlus size={13} /> Add IOC</button>
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
              <th style={{ width: 130 }}>Confidence</th>
              <th>Sources</th>
              <th style={{ width: 90 }}>Hits</th>
              <th>First seen</th>
              <th>Last seen</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
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
                    <td colSpan={9} style={{ padding: 0 }}>
                      <IOCExpanded ioc={ioc} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
