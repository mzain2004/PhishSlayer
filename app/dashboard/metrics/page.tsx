'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useState } from 'react';
import { ITrend, ITrendDown } from '@/components/ui/icons';

const METRICS_FALLBACK = {
  mttr_min: 4.2,
  mttr_delta: -12,
  alerts_today: 247,
  alerts_delta: 18,
  auto_close_pct: 82,
  auto_close_delta: 4,
  fp_rate_pct: 3.1,
  fp_delta: -0.8,
  mttr_trend: [6.4, 5.9, 5.5, 5.1, 4.8, 4.5, 4.2],
  alert_volume: [
    { day: 'Mon', critical: 3,  high: 18, medium: 41, low: 95 },
    { day: 'Tue', critical: 1,  high: 22, medium: 38, low: 110 },
    { day: 'Wed', critical: 5,  high: 31, medium: 52, low: 128 },
    { day: 'Thu', critical: 2,  high: 17, medium: 44, low: 102 },
    { day: 'Fri', critical: 4,  high: 26, medium: 48, low: 118 },
    { day: 'Sat', critical: 1,  high: 9,  medium: 22, low: 64  },
    { day: 'Sun', critical: 6,  high: 28, medium: 51, low: 162 },
  ],
  agent_perf: [
    { agent: 'L1 Triage',   latency: '3.2s',  tokens: '1,240', success: '98.2%', active: true },
    { agent: 'L2 Response', latency: '11.4s', tokens: '3,890', success: '94.7%', active: true },
    { agent: 'L3 Hunt',     latency: '67s',   tokens: '8,240', success: '91.2%', active: true },
    { agent: 'Reader',      latency: '2.8s',  tokens: '910',   success: '99.0%', active: true },
    { agent: 'Hunter',      latency: '14.6s', tokens: '4,120', success: '93.8%', active: true },
    { agent: 'Reviewer',    latency: '8.1s',  tokens: '2,470', success: '96.4%', active: true },
  ],
};

function Sparkline({ data, width = 120, height = 28, color = 'var(--accent-500)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = (max - min) || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 4) - 2] as [number, number]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

function StatCard({ label, value, unit, delta, betterDirection, spark }: { label: string; value: string | number; unit?: string; delta: number; betterDirection: 'up' | 'down'; spark: number[] }) {
  const isImproving = betterDirection === 'down' ? delta < 0 : delta > 0;
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">
        {value}{unit && <span style={{ fontSize: 16, color: 'var(--text-tertiary)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div className={`delta ${isImproving ? 'good' : 'bad'}`}>
        {isImproving ? <ITrend size={11} /> : <ITrendDown size={11} />}
        {delta < 0 ? '' : '+'}{delta}%
      </div>
      <div className="sparkline"><Sparkline data={spark} /></div>
    </div>
  );
}

function MTTRChart({ data }: { data: number[] }) {
  const W = 600, H = 180, P = 24;
  const min = 0, max = 16;
  const stepX = (W - P * 2) / (data.length - 1);
  const yFor = (v: number) => H - P - ((v - min) / (max - min)) * (H - P * 2);
  const pts = data.map((v, i) => [P + i * stepX, yFor(v)] as [number, number]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1][0]} ${H - P} L ${pts[0][0]} ${H - P} Z`;
  const slaY = yFor(15);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      <defs>
        <linearGradient id="mttrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-500)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 4, 8, 12, 16].map(v => (
        <g key={v}>
          <line x1={P} y1={yFor(v)} x2={W - P} y2={yFor(v)} stroke="var(--bg-border)" strokeOpacity="0.5" strokeDasharray="2 4" />
          <text x={P - 6} y={yFor(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{v}m</text>
        </g>
      ))}
      <line x1={P} y1={slaY} x2={W - P} y2={slaY} stroke="var(--severity-medium)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - P - 4} y={slaY - 4} textAnchor="end" fontSize="9" fill="var(--severity-medium)" fontFamily="var(--font-mono)">SLA 15m</text>
      <path d={area} fill="url(#mttrGrad)" />
      <path d={path} fill="none" stroke="var(--accent-500)" strokeWidth="2" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--accent-500)" />)}
      {days.map((d, i) => (
        <text key={d} x={P + i * stepX} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{d}</text>
      ))}
    </svg>
  );
}

function VolumeChart({ data }: { data: typeof METRICS_FALLBACK.alert_volume }) {
  const W = 400, H = 180, P = 24;
  const totals = data.map(d => d.critical + d.high + d.medium + d.low);
  const maxT = Math.max(...totals);
  const barW = (W - P * 2) / data.length * 0.7;
  const stepX = (W - P * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = H - P - f * (H - P * 2);
        return <line key={f} x1={P} y1={y} x2={W - P} y2={y} stroke="var(--bg-border)" strokeOpacity="0.4" strokeDasharray="2 4" />;
      })}
      {data.map((d, i) => {
        const cx = P + i * stepX + stepX / 2;
        const x = cx - barW / 2;
        const total = d.critical + d.high + d.medium + d.low;
        const yBase = H - P;
        let cursor = yBase;
        const segs = [
          { v: d.low,      color: '#475569' },
          { v: d.medium,   color: '#EAB308' },
          { v: d.high,     color: '#F97316' },
          { v: d.critical, color: '#EF4444' },
        ];
        return (
          <g key={i}>
            {segs.map((s, j) => {
              const h = (s.v / maxT) * (H - P * 2);
              cursor -= h;
              return <rect key={j} x={x} y={cursor} width={barW} height={h} fill={s.color} opacity={0.85} rx={j === segs.length - 1 ? 2 : 0} />;
            })}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{d.day}</text>
            <text x={cx} y={yBase - (total / maxT) * (H - P * 2) - 4} textAnchor="middle" fontSize="10" fill="var(--text-secondary)" fontFamily="var(--font-mono)">{total}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(METRICS_FALLBACK);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetch(`/api/metrics?range=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMetrics({ ...METRICS_FALLBACK, ...d }); })
      .catch(() => {});
  }, [period]);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <header className="page-header">
        <div>
          <h1>Metrics</h1>
          <div className="subtitle">SOC performance · last {period}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 7 }}>
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', background: period === p ? 'var(--accent-600)' : 'transparent', color: period === p ? 'white' : 'var(--text-secondary)', border: 0, borderRadius: 5, cursor: 'pointer' }}>{p}</button>
          ))}
        </div>
      </header>

      <div className="metrics-grid">
        <StatCard label="MTTR" value={metrics.mttr_min} unit="min" delta={metrics.mttr_delta} betterDirection="down" spark={metrics.mttr_trend} />
        <StatCard label="Alerts today" value={metrics.alerts_today.toLocaleString()} delta={metrics.alerts_delta} betterDirection="down" spark={[180,195,210,225,232,240,247]} />
        <StatCard label="Auto-close rate" value={metrics.auto_close_pct} unit="%" delta={metrics.auto_close_delta} betterDirection="up" spark={[72,75,76,78,79,81,82]} />
        <StatCard label="False positive rate" value={metrics.fp_rate_pct} unit="%" delta={metrics.fp_delta} betterDirection="down" spark={[4.4,4.2,4.0,3.8,3.5,3.3,3.1]} />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>
            MTTR Trend
            <span className="legend">
              <span><span className="swatch" style={{ background: 'var(--accent-500)' }} />MTTR (min)</span>
              <span><span className="swatch" style={{ background: 'var(--severity-medium)', borderRadius: 0, height: 2, width: 10 }} />SLA 15m</span>
            </span>
          </h3>
          <MTTRChart data={metrics.mttr_trend} />
        </div>
        <div className="chart-card">
          <h3>
            Alert volume
            <span className="legend">
              <span><span className="swatch" style={{ background: '#EF4444' }} />Crit</span>
              <span><span className="swatch" style={{ background: '#F97316' }} />High</span>
              <span><span className="swatch" style={{ background: '#EAB308' }} />Med</span>
            </span>
          </h3>
          <VolumeChart data={metrics.alert_volume} />
        </div>
      </div>

      <div className="agents-table-wrap" style={{ padding: '0 32px 32px' }}>
        <div className="chart-card">
          <h3>Agent performance</h3>
          <table className="ioc-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Avg latency</th>
                <th>Tokens/alert</th>
                <th>Success rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.agent_perf.map(a => (
                <tr key={a.agent}>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text-primary)' }}>{a.agent}</td>
                  <td>{a.latency}</td>
                  <td>{a.tokens}</td>
                  <td style={{ color: parseFloat(a.success) >= 95 ? '#86EFAC' : '#FDE047' }}>{a.success}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#86EFAC', fontFamily: 'var(--font-display)', fontSize: 11 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} /> ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
