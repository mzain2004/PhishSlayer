'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useState } from 'react';
import { ICheck, IX, IArrowRight } from '@/components/ui/icons';

interface EvoEvent {
  id: string;
  when: string;
  type: string;
  level: string;
  status: string;
  title: string;
  desc: string;
  expected_improvement?: string;
  result?: string;
  before?: string[];
  after?: string[];
  changed_indices?: number[];
}

const EVO_EVENTS_SEED: EvoEvent[] = [
  { id: 'ev-001', when: '2h ago', type: 'OPENSPACE', level: 'L1', status: 'PROPOSED', title: 'Action space rebalanced for credential_stuffing', desc: 'vt_check_ip promoted to rank #1 — outperforms abuseipdb on Tor-affiliated IPs.', expected_improvement: '+6.2% accuracy', before: ['abuseipdb_check','vt_check_ip','urlscan_submit'], after: ['vt_check_ip','abuseipdb_check','urlscan_submit'], changed_indices: [0,1] },
  { id: 'ev-002', when: '6h ago', type: 'EVOMAP', level: 'L2', status: 'PROPOSED', title: 'New capability proposed: graph_revoke_token', desc: 'EvoMap derived a tighter scope wrapper around graph_revoke_session limited to a single OAuth scope.', expected_improvement: 'reduces blast radius from user→token' },
  { id: 'ev-003', when: 'Yesterday', type: 'HALO', level: 'L2', status: 'APPLIED', title: 'Confidence threshold raised', desc: 'Threshold updated 0.85 → 0.87 for L2 auto-execute. Applied by John (SOC Manager) at 14:32.', result: 'FP rate dropped 1.2% in 24h' },
  { id: 'ev-004', when: '2 days ago', type: 'OPENSPACE', level: 'L1', status: 'APPLIED', title: 'Tool added: shodan_lookup', desc: 'shodan_lookup added to L1 toolbelt for IP reputation enrichment.', result: 'Median L1 latency unchanged (3.2s); accuracy +1.4%' },
  { id: 'ev-005', when: '3 days ago', type: 'HALO', level: 'L1', status: 'REJECTED', title: 'Token budget reduction', desc: 'HALO suggested L1 token cap 1500 → 1200. Rejected — would have truncated 8% of traces.' },
];

function EvolutionEvent({ event, onApprove, onReject }: { event: EvoEvent; onApprove: () => void; onReject: () => void }) {
  return (
    <article className={`evo-event ${event.status === 'PROPOSED' ? 'proposed' : ''}`}>
      <div className="row1">
        <span className={`evo-chip ${event.type.toLowerCase()}`}>{event.type}</span>
        <span className={`evo-chip ${event.level.toLowerCase()}`}>{event.level}</span>
        <span className={`evo-chip ${event.status.toLowerCase()}`}>{event.status}</span>
        <span className="when">{event.when}</span>
      </div>
      <div className="title">{event.title}</div>
      <div className="desc">
        {event.desc}
        {event.expected_improvement && <> · Expected improvement: <span className="imp">{event.expected_improvement}</span></>}
        {event.result && <> · Result: <span className="imp">{event.result}</span></>}
      </div>
      {event.before && event.after && (
        <div className="diff-grid">
          <div className="diff-col">
            <div className="col-label">Before</div>
            <ol>
              {event.before.map((b, i) => (
                <li key={i} className={event.changed_indices?.includes(i) ? 'changed' : ''}>{b}</li>
              ))}
            </ol>
          </div>
          <div className="diff-arrow"><IArrowRight size={16} /></div>
          <div className="diff-col">
            <div className="col-label">After</div>
            <ol>
              {event.after.map((a, i) => (
                <li key={i} className={event.changed_indices?.includes(i) ? 'changed' : ''}>{a}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {event.status === 'PROPOSED' && (
        <div className="evo-actions">
          <button className="btn success" onClick={onApprove}><ICheck size={13} /> Approve</button>
          <button className="btn ghost" onClick={onReject}><IX size={13} /> Reject</button>
        </div>
      )}
    </article>
  );
}

function HALOChart() {
  const W = 600, H = 200, P = 28;
  const points: [number, number][] = [[0.80,5.4],[0.82,4.6],[0.84,4.0],[0.85,3.6],[0.87,3.1],[0.89,2.4],[0.91,1.8]];
  const xFor = (v: number) => P + ((v - 0.80) / 0.11) * (W - P * 2);
  const yFor = (v: number) => H - P - (v / 6) * (H - P * 2);
  const fpPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p[0])} ${yFor(p[1])}`).join(' ');
  const tpPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p[0])} ${P + (1 - (p[0] - 0.80) / 0.11) * (H - P * 2)}`).join(' ');
  const currentX = xFor(0.87);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 240 }}>
      {[0,1,2,3,4,5,6].map(v => (
        <g key={v}>
          <line x1={P} y1={yFor(v)} x2={W - P} y2={yFor(v)} stroke="var(--bg-border)" strokeOpacity="0.4" strokeDasharray="2 4" />
          <text x={P - 6} y={yFor(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{v}%</text>
        </g>
      ))}
      <path d={fpPath} stroke="var(--severity-critical)" strokeWidth="2" fill="none" strokeDasharray="6 3" />
      <path d={tpPath} stroke="var(--accent-500)" strokeWidth="2" fill="none" />
      <line x1={currentX} y1={P} x2={currentX} y2={H - P} stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3 3" />
      <text x={currentX} y={P - 4} textAnchor="middle" fontSize="10" fill="var(--accent-400)" fontFamily="var(--font-mono)">current 0.87</text>
      {points.map((p, i) => (
        <g key={i}>
          <text x={xFor(p[0])} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{p[0].toFixed(2)}</text>
          <circle cx={xFor(p[0])} cy={yFor(p[1])} r="3" fill="var(--severity-critical)" />
        </g>
      ))}
    </svg>
  );
}

function HALOTab() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 920, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="chart-card">
        <h3>Confidence threshold vs FP rate</h3>
        <HALOChart />
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Current: <span style={{ color: 'var(--accent-400)' }}>0.87</span> threshold ·
          <span style={{ color: '#86EFAC', marginLeft: 6 }}>3.1%</span> FP rate
        </div>
      </div>
      <div className="evo-event proposed">
        <div className="row1">
          <span className="evo-chip halo">HALO</span>
          <span className="evo-chip l2">L2</span>
          <span className="evo-chip suggested">SUGGESTED</span>
          <span className="when">12 min ago</span>
        </div>
        <div className="title">Raise threshold 0.87 → 0.89</div>
        <div className="desc">
          Basis: 50-incident analysis · Expected FP reduction: <span className="imp">-0.8%</span> · No expected impact on TPR.
        </div>
        <div className="evo-actions">
          <button className="btn success"><ICheck size={13} /> Apply</button>
          <button className="btn ghost"><IX size={13} /> Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function CapabilitiesTab() {
  const caps = [
    { name: 'vt_check_ip',           used: 1240, success: '98%', level: 'L1' },
    { name: 'abuseipdb_check',       used: 980,  success: '94%', level: 'L1' },
    { name: 'urlscan_submit',        used: 612,  success: '92%', level: 'L1' },
    { name: 'rag_query',             used: 1860, success: '99%', level: 'L1/L2' },
    { name: 'graph_get_signin_logs', used: 720,  success: '97%', level: 'L2' },
    { name: 'graph_revoke_session',  used: 89,   success: '100%', level: 'L2' },
    { name: 'graph_revoke_token',    used: 12,   success: '—',   level: 'L2', proposed: true },
    { name: 'wazuh_query_endpoint',  used: 540,  success: '95%', level: 'L2' },
    { name: 'shodan_lookup',         used: 320,  success: '93%', level: 'L1' },
  ];
  return (
    <div style={{ padding: '24px 32px' }}>
      <div className="chart-card" style={{ maxWidth: 760 }}>
        <h3>Active capabilities · {caps.length} tools</h3>
        <table className="ioc-table" style={{ width: '100%' }}>
          <thead>
            <tr><th>Tool</th><th>Level</th><th>Calls (7d)</th><th>Success</th><th></th></tr>
          </thead>
          <tbody>
            {caps.map(c => (
              <tr key={c.name}>
                <td style={{ color: 'var(--accent-400)' }}>{c.name}</td>
                <td><span className="ioc-type">{c.level}</span></td>
                <td>{c.used.toLocaleString()}</td>
                <td style={{ color: c.success === '—' ? 'var(--text-tertiary)' : '#86EFAC' }}>{c.success}</td>
                <td>{c.proposed && <span className="evo-chip proposed">NEW</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EvolutionPage() {
  const [tab, setTab] = useState<'timeline' | 'caps' | 'halo'>('timeline');
  const [events, setEvents] = useState<EvoEvent[]>(EVO_EVENTS_SEED);

  useEffect(() => {
    fetch('/api/evolution')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.proposals?.length) setEvents(d.proposals); })
      .catch(() => {});
  }, []);

  const handleApprove = (id: string) =>
    setEvents(evs => evs.map(e => e.id === id ? { ...e, status: 'APPLIED' } : e));
  const handleReject = (id: string) =>
    setEvents(evs => evs.map(e => e.id === id ? { ...e, status: 'REJECTED' } : e));

  const pending = events.filter(e => e.status === 'PROPOSED').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="page-header">
        <div>
          <h1>Evolution</h1>
          <div className="subtitle">{pending} proposals awaiting review · agents adapting in real time</div>
        </div>
      </header>

      <div className="evo-tabs">
        {([['timeline','Timeline'],['caps','Capabilities'],['halo','HALO Optimizer']] as const).map(([id, label]) => (
          <button key={id} className={`evo-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'timeline' && (
          <div className="evo-timeline">
            {events.map(ev => (
              <EvolutionEvent
                key={ev.id}
                event={ev}
                onApprove={() => handleApprove(ev.id)}
                onReject={() => handleReject(ev.id)}
              />
            ))}
          </div>
        )}
        {tab === 'halo' && <HALOTab />}
        {tab === 'caps' && <CapabilitiesTab />}
      </div>
    </div>
  );
}
