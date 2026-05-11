'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useRef, useState } from 'react';
import { IBook, IChevLeft, IChevRight, IDownload, IExpand, IPause } from '@/components/ui/icons';

interface HuntLine {
  t: string;
  agent: 'reader' | 'hunter' | 'reviewer';
  msg: string;
}

interface IOC {
  type: string;
  value: string;
  score: number;
  first_seen: string;
  related: number;
}

const SEED_HUNT_LINES: HuntLine[] = [
  { t: '12:34:08', agent: 'reader', msg: 'Loading alert context for 3f92a1c0...' },
  { t: '12:34:09', agent: 'reader', msg: 'Found 3 similar past incidents (avg sim 0.81)' },
  { t: '12:34:11', agent: 'reader', msg: 'Context ready — 4 IOCs, 1 user, 1 device identified' },
  { t: '12:34:12', agent: 'hunter', msg: 'Querying VirusTotal for ip:185.220.101.42 ...' },
  { t: '12:34:13', agent: 'hunter', msg: 'VT verdict: malicious (47/72) — Tor exit + brute-force history' },
  { t: '12:34:14', agent: 'hunter', msg: 'Crawling associated-domain.cc for redirect chain...' },
  { t: '12:34:16', agent: 'hunter', msg: 'Resolved → 198.51.100.4 → kit-2024.tld (phishing kit, fingerprint match)' },
  { t: '12:34:17', agent: 'hunter', msg: 'Found 2 related campaigns in RAG: APT-41 (sim 0.89), FIN8 (sim 0.61)' },
  { t: '12:34:18', agent: 'hunter', msg: 'Expanding IOC graph — 2 new IPs, 1 hash, 1 domain' },
  { t: '12:34:20', agent: 'hunter', msg: 'Pivoting on hash 3f924e... → 5 historical detections across tenants' },
  { t: '12:34:21', agent: 'reviewer', msg: 'Hunter complete. Synthesizing report...' },
  { t: '12:34:23', agent: 'reviewer', msg: 'Cross-referencing with MITRE ATT&CK matrix' },
  { t: '12:34:24', agent: 'reviewer', msg: 'Mapping to T1110, T1078, T1133' },
  { t: '12:34:25', agent: 'reviewer', msg: 'Drafting recommendations (3 actions, ranked by impact)' },
  { t: '12:34:27', agent: 'reviewer', msg: 'Report ready — confidence 0.89, recommend immediate response' },
];

const SEED_IOCS: IOC[] = [
  { type: 'IP',     value: '185.220.101.42',       score: 94, first_seen: '4h ago',  related: 8 },
  { type: 'IP',     value: '198.51.100.4',          score: 78, first_seen: '12h ago', related: 3 },
  { type: 'Domain', value: 'associated-domain.cc',  score: 88, first_seen: '2h ago',  related: 5 },
  { type: 'Domain', value: 'kit-2024.tld',           score: 91, first_seen: '6h ago',  related: 4 },
  { type: 'Hash',   value: '3f924e51c0a8b...d792',  score: 96, first_seen: '1d ago',  related: 11 },
];

const MITRE_TECHNIQUES = [
  { id: 'T1110.004', name: 'Credential Stuffing' },
  { id: 'T1078',     name: 'Valid Accounts' },
  { id: 'T1133',     name: 'External Remote Services' },
  { id: 'T1556',     name: 'Modify Authentication Process' },
  { id: 'T1071.001', name: 'Application Layer Protocol' },
];

const RECOMMENDATIONS = [
  'Revoke all active sessions for a.harrington@contoso.com and force password reset on next sign-in.',
  'Add Conditional Access policy: block sign-ins from Tor exit nodes (named-location feed).',
  'Review past 72h of VPN access logs for the same user-agent fingerprint and pivot on matches.',
];

function highlightLog(msg: string) {
  return msg
    .replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, '<span class="ip">$1</span>')
    .replace(/([a-z0-9-]+\.(?:cc|tld|com|net))/g, '<span class="domain">$1</span>');
}

function PhaseIndicator({ phases }: { phases: { name: string; status: string }[] }) {
  return (
    <div className="phase-indicator">
      {phases.map((p, i) => (
        <>
          <div key={p.name} className={`phase-pill ${p.status}`}>
            <span className="ring">{p.status === 'complete' ? '✓' : ''}</span>
            <span className="name">{p.name}</span>
            <span style={{ fontSize: 11, color: 'inherit', opacity: 0.7 }}>
              {p.status === 'complete' ? 'Complete' : p.status === 'running' ? 'Running' : 'Pending'}
            </span>
          </div>
          {i < phases.length - 1 && (
            <div key={`line-${i}`} className={`phase-line ${
              phases[i].status === 'complete' && phases[i + 1].status === 'complete' ? 'complete' :
              phases[i].status === 'complete' && phases[i + 1].status === 'running' ? 'partial' : ''
            }`} />
          )}
        </>
      ))}
    </div>
  );
}

function ReportCard({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`hunt-report-card ${open ? 'open' : ''}`}>
      <button className="card-head" onClick={onToggle}>
        <span className="title">{title}</span>
        <span className="chev"><IChevRight size={12} /></span>
      </button>
      <div className="card-body">{children}</div>
    </div>
  );
}

function ConfidenceBar({ score, width = 80 }: { score: number; width?: number }) {
  const level = score >= 0.85 ? 'high' : score >= 0.6 ? 'medium' : 'low';
  return (
    <div className="conf-bar" style={{ width }}>
      <div className={`conf-fill ${level}`} style={{ width: `${score * 100}%` }} />
      <span className="conf-val">{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function HuntingPage() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [reportOpen, setReportOpen] = useState({ summary: true, ioc: false, mitre: false, rec: false });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleLines >= SEED_HUNT_LINES.length) return;
    const t = setTimeout(() => setVisibleLines(v => v + 1), 600 + Math.random() * 700);
    return () => clearTimeout(t);
  }, [visibleLines]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleLines]);

  const phases = (() => {
    const reader = visibleLines >= 3 ? 'complete' : 'running';
    const hunter = visibleLines < 3 ? 'pending' : (visibleLines >= 11 ? 'complete' : 'running');
    const reviewer = visibleLines < 11 ? 'pending' : (visibleLines >= SEED_HUNT_LINES.length ? 'complete' : 'running');
    return [
      { name: 'Reader',   status: reader },
      { name: 'Hunter',   status: hunter },
      { name: 'Reviewer', status: reviewer },
    ];
  })();

  const huntComplete = visibleLines >= SEED_HUNT_LINES.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn ghost" onClick={() => window.history.back()}>
              <IChevLeft size={14} /> Alerts
            </button>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <h1 style={{ fontSize: 18 }}>Deep Hunt #8a3f021c</h1>
          </div>
          <div className="subtitle" style={{ marginTop: 6 }}>
            &ldquo;Investigate APT campaign — 185.220.101.42&rdquo; · dispatched 2 min ago
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><IPause size={13} /> Pause</button>
          <button className="btn"><IExpand size={13} /></button>
        </div>
      </header>

      <div className="hunt-content" style={{ flex: 1, overflowY: 'auto' }}>
        <PhaseIndicator phases={phases} />

        <section>
          <div className="sec-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Live log</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
              {visibleLines}/{SEED_HUNT_LINES.length} lines · {Math.round(visibleLines * 137)} tokens
            </span>
          </div>
          <div className="live-log" ref={logRef}>
            {SEED_HUNT_LINES.slice(0, visibleLines).map((l, i) => (
              <div className="log-line" key={i}>
                <span className="log-time">{l.t}</span>
                <span className={`agent-chip ${l.agent}`}>{l.agent}</span>
                <span className="log-msg" dangerouslySetInnerHTML={{ __html: highlightLog(l.msg) }} />
              </div>
            ))}
            {!huntComplete && visibleLines > 0 && (
              <div className="log-line">
                <span className="log-time">—</span>
                <span className={`agent-chip ${SEED_HUNT_LINES[visibleLines - 1]?.agent || 'reader'}`}>
                  {SEED_HUNT_LINES[visibleLines - 1]?.agent || 'reader'}
                </span>
                <span className="log-msg streaming-cursor" />
              </div>
            )}
          </div>
        </section>

        {huntComplete && (
          <>
            <ReportCard
              title="Executive summary"
              open={reportOpen.summary}
              onToggle={() => setReportOpen(s => ({ ...s, summary: !s.summary }))}
            >
              <p className="summary-text">
                APT-41 affiliated campaign targeting credential harvesting via Tor exit nodes.
                High confidence <span style={{ color: '#86EFAC', fontFamily: 'var(--font-mono)' }}>(0.89)</span>.
                Initial access vector: credential stuffing against{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>a.harrington@contoso.com</span>.
                Recommend immediate session revocation, password reset, and Conditional Access policy update to block Tor exit nodes.
              </p>
            </ReportCard>

            <ReportCard
              title={`IOCs · ${SEED_IOCS.length}`}
              open={reportOpen.ioc}
              onToggle={() => setReportOpen(s => ({ ...s, ioc: !s.ioc }))}
            >
              <table className="ioc-table">
                <thead>
                  <tr><th>Type</th><th>Value</th><th>Threat</th><th>First seen</th><th>Related</th></tr>
                </thead>
                <tbody>
                  {SEED_IOCS.map((ioc, i) => (
                    <tr key={i}>
                      <td><span className="ioc-type">{ioc.type}</span></td>
                      <td>{ioc.value}</td>
                      <td className="score">
                        <span style={{ color: ioc.score >= 90 ? '#FCA5A5' : ioc.score >= 70 ? '#FDE047' : '#86EFAC' }}>
                          {ioc.score}
                        </span>
                        <ConfidenceBar score={ioc.score / 100} width={40} />
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{ioc.first_seen}</td>
                      <td>{ioc.related}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportCard>

            <ReportCard
              title="MITRE ATT&CK · 5 techniques"
              open={reportOpen.mitre}
              onToggle={() => setReportOpen(s => ({ ...s, mitre: !s.mitre }))}
            >
              <div className="mitre-grid">
                {MITRE_TECHNIQUES.map(t => (
                  <span key={t.id} className="mitre-badge" title={t.name}>
                    <span className="id">{t.id}</span>
                    <span className="name">{t.name}</span>
                  </span>
                ))}
              </div>
            </ReportCard>

            <ReportCard
              title={`Recommendations · ${RECOMMENDATIONS.length}`}
              open={reportOpen.rec}
              onToggle={() => setReportOpen(s => ({ ...s, rec: !s.rec }))}
            >
              <ol className="recommendation-list">
                {RECOMMENDATIONS.map((r, i) => <li key={i}>{r}</li>)}
              </ol>
            </ReportCard>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn primary"><IDownload size={13} /> Export PDF</button>
              <button className="btn"><IBook size={13} /> Index to Threat Intel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
