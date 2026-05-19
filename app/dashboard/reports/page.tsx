'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useState } from 'react';
import { IDownload, IExternal, IPlus, IShield, IX } from '@/components/ui/icons';
import { TLPBadge, TLPSelector, type TLPLevel } from '@/components/ui/TLPBadge';

interface Report {
  id: string;
  name: string;
  type: string;
  date: string;
  alerts: number;
  size: string;
  desc: string;
  tlp_level?: string;
}

const REPORT_DATA: Report[] = [
  { id: 'r001', name: 'Weekly Executive Briefing', type: 'executive', date: '2026-05-10', alerts: 247, size: '1.2 MB',
    desc: 'High-level summary of threat landscape, MTTR trends, and top incidents for leadership.', tlp_level: 'amber' },
  { id: 'r002', name: 'APT-41 Campaign Deep-Dive', type: 'threat-intel', date: '2026-05-10', alerts: 12, size: '3.8 MB',
    desc: 'Full technical breakdown of APT-41 credential harvesting campaign targeting M365.', tlp_level: 'red' },
  { id: 'r003', name: 'ISO 27001 Compliance Audit', type: 'compliance', date: '2026-05-08', alerts: 98, size: '2.1 MB',
    desc: 'Automated compliance evidence export covering all active controls for auditors.', tlp_level: 'amber' },
  { id: 'r004', name: 'Daily Ops Report — May 9', type: 'technical', date: '2026-05-09', alerts: 219, size: '0.8 MB',
    desc: 'Full incident log with agent decisions, latency breakdown, and FP analysis.', tlp_level: 'amber' },
  { id: 'r005', name: 'Credential Stuffing Postmortem', type: 'technical', date: '2026-05-07', alerts: 6, size: '1.5 MB',
    desc: 'Root cause analysis and timeline reconstruction for the May 7 stuffing wave.', tlp_level: 'amber' },
  { id: 'r006', name: 'SOC KPI Monthly Summary — April', type: 'executive', date: '2026-04-30', alerts: 2810, size: '0.9 MB',
    desc: 'Monthly KPIs: MTTR, auto-close rate, agent performance, FP rate trends.', tlp_level: 'green' },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(REPORT_DATA);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState('executive');
  const [reportTlp, setReportTlp] = useState<TLPLevel>('amber');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.reports?.length) setReports(d.reports); })
      .catch(() => {});
  }, []);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      setTimeout(() => setShowModal(false), 800);
    }, 1600);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <div className="subtitle">{reports.length} reports · executive, technical &amp; compliance</div>
        </div>
        <button className="btn primary" onClick={() => { setShowModal(true); setGenerated(false); }}>
          <IPlus size={13} /> Generate report
        </button>
      </header>

      <div className="reports-grid">
        {reports.map(r => (
          <div key={r.id} className="report-card">
            <div className="rc-head">
              <h3 className="rc-title">{r.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TLPBadge level={(r.tlp_level as TLPLevel) ?? 'amber'} size="sm" />
                <span className={`rc-type ${r.type}`}>
                  {r.type === 'threat-intel' ? 'THREAT INTEL' : r.type.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.desc}</div>
            <div className="rc-meta">
              <span>Generated: {r.date}</span>
              <span>Size: {r.size}</span>
            </div>
            <div className="rc-stats">
              <span><IShield size={11} style={{ color: 'var(--text-tertiary)' }} /> {r.alerts.toLocaleString()} alerts covered</span>
            </div>
            <div className="rc-actions">
              <button className="btn primary"><IDownload size={12} /> PDF</button>
              <button className="btn">JSON</button>
              <button className="btn ghost"><IExternal size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>
              Generate report
              <button className="btn ghost" style={{ padding: '2px 6px' }} onClick={() => setShowModal(false)}>
                <IX size={13} />
              </button>
            </h3>
            <div className="field-group">
              <div>
                <label>Report type</label>
                <select value={reportType} onChange={e => setReportType(e.target.value)}>
                  <option value="executive">Executive briefing</option>
                  <option value="technical">Technical ops report</option>
                  <option value="compliance">Compliance export</option>
                  <option value="threat-intel">Threat intel deep-dive</option>
                </select>
              </div>
              <div>
                <label>Include alerts from</label>
                <div className="date-range">
                  <input type="date" defaultValue="2026-05-03" />
                  <input type="date" defaultValue="2026-05-10" />
                </div>
              </div>
              <div>
                <label>Format</label>
                <select>
                  <option>PDF + JSON</option>
                  <option>PDF only</option>
                  <option>JSON only</option>
                </select>
              </div>
              <TLPSelector value={reportTlp} onChange={setReportTlp} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn primary" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating...' : generated ? '✓ Done' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
