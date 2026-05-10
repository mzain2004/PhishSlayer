// screens.jsx — page-level components for each route.

// ── ALERT QUEUE ──────────────────────────────────────────────────────────────
function AlertQueueScreen({ alerts, selectedId, onSelect, density, showResolved, recentlyFlashed }) {
  const [expandResolved, setExpandResolved] = React.useState(showResolved);
  const [filters, setFilters] = React.useState({ severity: 'all', status: 'all', type: 'all', range: '24h' });
  const [search, setSearch] = React.useState('');

  React.useEffect(() => { setExpandResolved(showResolved); }, [showResolved]);

  const filtered = alerts.filter(a => {
    if (filters.severity !== 'all' && a.severity !== filters.severity) return false;
    if (filters.status !== 'all' && a.status !== filters.status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.src_ip.includes(q) && !a.target.toLowerCase().includes(q) && !a.attack.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const open = filtered.filter(a => !a.resolved);
  const resolved = filtered.filter(a => a.resolved);

  const counts = {
    open: alerts.filter(a => !a.resolved).length,
    aiResolved: alerts.filter(a => a.resolved && a.status === 'closed').length,
    pending: alerts.filter(a => a.status === 'pending' || a.status === 'escalated').length,
  };

  return (
    <div className="alert-queue">
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
          label="Attack type"
          value={filters.type}
          options={[['all','All types'],['cs','Credential stuffing'],['it','Impossible travel'],['ml','Lateral movement']]}
          onChange={v => setFilters(f => ({ ...f, type: v }))}
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
          {open.map(a => (
            <AlertRow
              key={a.id}
              alert={a}
              density={density}
              selected={a.id === selectedId}
              flashing={recentlyFlashed.has(a.id)}
              onClick={() => onSelect(a)}
            />
          ))}
          {open.length === 0 && (
            <tr><td colSpan="8">
              <div className="empty-state">
                <div className="ico">⌖</div>
                <h3>No alerts match these filters</h3>
                <p>Adjust filters or wait for new events</p>
              </div>
            </td></tr>
          )}

          {resolved.length > 0 && (
            <tr className={`resolved-group-row ${expandResolved ? 'expanded' : ''}`}
                onClick={() => setExpandResolved(e => !e)}>
              <td colSpan="8">
                <span className="chev"><IChevRight size={11} /></span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  AI Resolved ({resolved.length})
                </span>
                <span style={{ marginLeft: 10 }}>
                  {expandResolved ? 'Showing auto-closed alerts' : 'Click to expand auto-closed alerts'}
                </span>
              </td>
            </tr>
          )}
          {expandResolved && resolved.map(a => (
            <AlertRow
              key={a.id}
              alert={a}
              density={density}
              selected={a.id === selectedId}
              flashing={false}
              onClick={() => onSelect(a)}
              resolved
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertRow({ alert, density, selected, flashing, onClick, resolved }) {
  return (
    <tr
      className={[
        density === 'compact' ? 'density-compact' : density === 'spacious' ? 'density-spacious' : 'density-comfortable',
        selected && 'selected',
        flashing && 'flash',
        resolved && 'resolved'
      ].filter(Boolean).join(' ')}
      data-severity={alert.severity}
      data-status={alert.status}
      onClick={onClick}
      role="row"
      tabIndex="0"
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

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = options.find(o => o[0] === value)?.[1] || label;
  const isActive = value !== 'all' && value !== '24h';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`filter-pill ${isActive ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        <span>{label}: {current}</span>
        <IChevDown size={10} className="chev" />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: 6,
          padding: 4,
          minWidth: 160,
          zIndex: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {options.map(([val, lab]) => (
            <button
              key={val}
              onClick={() => { onChange(val); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                fontSize: 12,
                background: value === val ? 'var(--bg-hover)' : 'transparent',
                border: 0,
                color: value === val ? 'var(--accent-400)' : 'var(--text-secondary)',
                borderRadius: 4,
              }}
            >
              {lab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HUNT VIEW ────────────────────────────────────────────────────────────────
function HuntScreen({ onBack }) {
  const [visibleLines, setVisibleLines] = React.useState(0);
  const [reportOpen, setReportOpen] = React.useState({ summary: true, ioc: false, mitre: false, rec: false });
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (visibleLines >= SEED_HUNT_LINES.length) return undefined;
    const t = setTimeout(() => setVisibleLines(v => v + 1), 600 + Math.random() * 700);
    return () => clearTimeout(t);
  }, [visibleLines]);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleLines]);

  const phases = (() => {
    const lastAgent = visibleLines > 0 ? SEED_HUNT_LINES[visibleLines - 1].agent : null;
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
    <div className="hunt-page">
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn ghost" onClick={onBack}>
              <IChevLeft size={14} /> Alerts
            </button>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <h1 style={{ fontSize: 18 }}>Deep Hunt #8a3f021c</h1>
          </div>
          <div className="subtitle" style={{ marginTop: 6 }}>
            "Investigate APT campaign — 185.220.101.42" · dispatched 2 min ago
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><IPause size={13} /> Pause</button>
          <button className="btn"><IExpand size={13} /></button>
        </div>
      </header>

      <div className="hunt-content">
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
                <span className="log-msg streaming-cursor"></span>
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
                Initial access vector: credential stuffing against <span style={{ fontFamily: 'var(--font-mono)' }}>a.harrington@contoso.com</span>.
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

function highlightLog(msg) {
  // bold IPs and domains
  return msg
    .replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, '<span class="ip">$1</span>')
    .replace(/([a-z0-9-]+\.(?:cc|tld|com|net))/g, '<span class="domain">$1</span>');
}

function PhaseIndicator({ phases }) {
  return (
    <div className="phase-indicator">
      {phases.map((p, i) => (
        <React.Fragment key={p.name}>
          <div className={`phase-pill ${p.status}`}>
            <span className="ring">{p.status === 'complete' ? '✓' : ''}</span>
            <span className="name">{p.name}</span>
            <span style={{ fontSize: 11, color: 'inherit', opacity: 0.7 }}>
              {p.status === 'complete' ? 'Complete' : p.status === 'running' ? 'Running' : 'Pending'}
            </span>
          </div>
          {i < phases.length - 1 && (
            <div className={`phase-line ${
              phases[i].status === 'complete' && phases[i + 1].status === 'complete' ? 'complete' :
              phases[i].status === 'complete' && phases[i + 1].status === 'running' ? 'partial' : ''
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ReportCard({ title, open, onToggle, children }) {
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

// ── METRICS DASHBOARD ────────────────────────────────────────────────────────
function MetricsScreen() {
  const [period, setPeriod] = React.useState('7d');
  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Metrics</h1>
          <div className="subtitle">SOC performance · last {period}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 7 }}>
          {['7d', '30d', '90d'].map(p => (
            <button key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      background: period === p ? 'var(--accent-600)' : 'transparent',
                      color: period === p ? 'white' : 'var(--text-secondary)',
                      border: 0,
                      borderRadius: 5,
                    }}>{p}</button>
          ))}
        </div>
      </header>

      <div className="metrics-grid">
        <StatCard label="MTTR" value={`${METRICS.mttr_min}`} unit="min"
                  delta={METRICS.mttr_delta} betterDirection="down"
                  spark={METRICS.mttr_trend} />
        <StatCard label="Alerts today" value={METRICS.alerts_today.toLocaleString()}
                  delta={METRICS.alerts_delta} betterDirection="down"
                  spark={[180, 195, 210, 225, 232, 240, 247]} />
        <StatCard label="Auto-close rate" value={`${METRICS.auto_close_pct}`} unit="%"
                  delta={METRICS.auto_close_delta} betterDirection="up"
                  spark={[72, 75, 76, 78, 79, 81, 82]} />
        <StatCard label="False positive rate" value={`${METRICS.fp_rate_pct}`} unit="%"
                  delta={METRICS.fp_delta} betterDirection="down"
                  spark={[4.4, 4.2, 4.0, 3.8, 3.5, 3.3, 3.1]} />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>
            MTTR Trend
            <span className="legend">
              <span><span className="swatch" style={{ background: 'var(--accent-500)' }}></span>MTTR (min)</span>
              <span><span className="swatch" style={{ background: 'var(--severity-medium)', borderRadius: 0, height: 2, width: 10 }}></span>SLA target 15m</span>
            </span>
          </h3>
          <MTTRChart data={METRICS.mttr_trend} />
        </div>
        <div className="chart-card">
          <h3>
            Alert volume
            <span className="legend">
              <span><span className="swatch" style={{ background: '#EF4444' }}></span>Crit</span>
              <span><span className="swatch" style={{ background: '#F97316' }}></span>High</span>
              <span><span className="swatch" style={{ background: '#EAB308' }}></span>Med</span>
            </span>
          </h3>
          <VolumeChart data={METRICS.alert_volume} />
        </div>
      </div>

      <div className="agents-table-wrap">
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
              {METRICS.agent_perf.map(a => (
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

function StatCard({ label, value, unit, delta, betterDirection, spark }) {
  const isImproving = betterDirection === 'down' ? delta < 0 : delta > 0;
  const arrow = delta < 0 ? '▼' : '▲';
  const cls = isImproving ? 'good' : 'bad';
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">
        {value}{unit && <span style={{ fontSize: 16, color: 'var(--text-tertiary)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div className={`delta ${cls}`}>
        {arrow} {Math.abs(delta)}{typeof delta === 'number' && Number.isInteger(delta) && label !== 'False positive rate' ? '%' : (label === 'False positive rate' ? 'pp' : '%')}
      </div>
      <Sparkline data={spark} />
    </div>
  );
}

function MTTRChart({ data }) {
  const W = 600, H = 180, P = 24;
  const min = 0, max = 16;
  const stepX = (W - P * 2) / (data.length - 1);
  const yFor = v => H - P - ((v - min) / (max - min)) * (H - P * 2);
  const pts = data.map((v, i) => [P + i * stepX, yFor(v)]);
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const area = path + ` L ${pts[pts.length - 1][0]} ${H - P} L ${pts[0][0]} ${H - P} Z`;
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
      {/* gridlines */}
      {[0, 4, 8, 12, 16].map(v => (
        <g key={v}>
          <line x1={P} y1={yFor(v)} x2={W - P} y2={yFor(v)}
                stroke="var(--bg-border)" strokeOpacity="0.5" strokeDasharray="2 4" />
          <text x={P - 6} y={yFor(v) + 3} textAnchor="end"
                fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{v}m</text>
        </g>
      ))}
      {/* SLA line */}
      <line x1={P} y1={slaY} x2={W - P} y2={slaY}
            stroke="var(--severity-medium)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - P - 4} y={slaY - 4} textAnchor="end"
            fontSize="9" fill="var(--severity-medium)" fontFamily="var(--font-mono)">SLA 15m</text>
      {/* area + line */}
      <path d={area} fill="url(#mttrGrad)" />
      <path d={path} fill="none" stroke="var(--accent-500)" strokeWidth="2" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--accent-500)" />)}
      {/* x-axis */}
      {days.map((d, i) => (
        <text key={d} x={P + i * stepX} y={H - 8} textAnchor="middle"
              fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{d}</text>
      ))}
    </svg>
  );
}

function VolumeChart({ data }) {
  const W = 400, H = 180, P = 24;
  const totals = data.map(d => d.critical + d.high + d.medium + d.low);
  const maxT = Math.max(...totals);
  const barW = (W - P * 2) / data.length * 0.7;
  const stepX = (W - P * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = H - P - f * (H - P * 2);
        return <line key={f} x1={P} y1={y} x2={W - P} y2={y}
                     stroke="var(--bg-border)" strokeOpacity="0.4" strokeDasharray="2 4" />;
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
              return <rect key={j} x={x} y={cursor} width={barW} height={h} fill={s.color}
                           opacity={0.85}
                           rx={j === segs.length - 1 ? 2 : 0} />;
            })}
            <text x={cx} y={H - 8} textAnchor="middle"
                  fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{d.day}</text>
            <text x={cx} y={yBase - (total / maxT) * (H - P * 2) - 4} textAnchor="middle"
                  fontSize="10" fill="var(--text-secondary)" fontFamily="var(--font-mono)">{total}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── EVOLUTION DASHBOARD ──────────────────────────────────────────────────────
function EvolutionScreen() {
  const [tab, setTab] = React.useState('timeline');
  const [events, setEvents] = React.useState(EVO_EVENTS);

  const handleApprove = (id) => setEvents(evs => evs.map(e => e.id === id ? { ...e, status: 'APPLIED' } : e));
  const handleReject  = (id) => setEvents(evs => evs.map(e => e.id === id ? { ...e, status: 'REJECTED' } : e));
  const pending = events.filter(e => e.status === 'PROPOSED').length;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Evolution</h1>
          <div className="subtitle">{pending} proposals awaiting review · agents adapting in real time</div>
        </div>
      </header>

      <div className="evo-tabs">
        {[['timeline','Timeline'],['caps','Capabilities'],['halo','HALO Optimizer']].map(([id, label]) => (
          <button key={id} className={`evo-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'timeline' && (
        <div className="evo-timeline">
          {events.map(ev => <EvolutionEvent key={ev.id} event={ev} onApprove={() => handleApprove(ev.id)} onReject={() => handleReject(ev.id)} />)}
        </div>
      )}

      {tab === 'halo' && <HALOTab />}
      {tab === 'caps' && <CapabilitiesTab />}
    </div>
  );
}

function EvolutionEvent({ event, onApprove, onReject }) {
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
          <span className="evo-chip proposed">SUGGESTED</span>
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

function HALOChart() {
  const W = 600, H = 200, P = 28;
  const points = [
    [0.80, 5.4], [0.82, 4.6], [0.84, 4.0], [0.85, 3.6], [0.87, 3.1], [0.89, 2.4], [0.91, 1.8]
  ];
  const xFor = v => P + ((v - 0.80) / 0.11) * (W - P * 2);
  const yFor = v => H - P - (v / 6) * (H - P * 2);
  const fpPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p[0])} ${yFor(p[1])}`).join(' ');
  const thresholdPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p[0])} ${P + (1 - (p[0] - 0.80) / 0.11) * (H - P * 2)}`).join(' ');
  const currentX = xFor(0.87);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 240 }}>
      {[0, 1, 2, 3, 4, 5, 6].map(v => (
        <g key={v}>
          <line x1={P} y1={yFor(v)} x2={W - P} y2={yFor(v)}
                stroke="var(--bg-border)" strokeOpacity="0.4" strokeDasharray="2 4" />
          <text x={P - 6} y={yFor(v) + 3} textAnchor="end"
                fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{v}%</text>
        </g>
      ))}
      <path d={fpPath} stroke="var(--severity-critical)" strokeWidth="2" fill="none" strokeDasharray="6 3" />
      <path d={thresholdPath} stroke="var(--accent-500)" strokeWidth="2" fill="none" />
      <line x1={currentX} y1={P} x2={currentX} y2={H - P}
            stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3 3" />
      <text x={currentX} y={P - 4} textAnchor="middle" fontSize="10"
            fill="var(--accent-400)" fontFamily="var(--font-mono)">current 0.87</text>
      {points.map((p, i) => (
        <g key={i}>
          <text x={xFor(p[0])} y={H - 8} textAnchor="middle"
                fontSize="9" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{p[0].toFixed(2)}</text>
          <circle cx={xFor(p[0])} cy={yFor(p[1])} r="3" fill="var(--severity-critical)" />
        </g>
      ))}
    </svg>
  );
}

function CapabilitiesTab() {
  const caps = [
    { name: 'vt_check_ip',          used: 1240, success: '98%', level: 'L1' },
    { name: 'abuseipdb_check',      used: 980,  success: '94%', level: 'L1' },
    { name: 'urlscan_submit',       used: 612,  success: '92%', level: 'L1' },
    { name: 'rag_query',            used: 1860, success: '99%', level: 'L1/L2' },
    { name: 'graph_get_signin_logs',used: 720,  success: '97%', level: 'L2' },
    { name: 'graph_revoke_session', used: 89,   success: '100%', level: 'L2' },
    { name: 'graph_revoke_token',   used: 12,   success: '—',    level: 'L2', proposed: true },
    { name: 'wazuh_query_endpoint', used: 540,  success: '95%', level: 'L2' },
    { name: 'shodan_lookup',        used: 320,  success: '93%', level: 'L1' },
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

// ── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = React.useState(1);
  const [waiting, setWaiting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleTest = () => {
    setWaiting(true);
    setSuccess(false);
    setTimeout(() => { setWaiting(false); setSuccess(true); }, 1800);
  };

  return (
    <div className="onboarding">
      <header className="topbar">
        <div className="brand">
          <div className="logo">P</div>
          PhishSlayer
          <span className="ver">v0.6</span>
        </div>
      </header>
      <div className="onboarding-card">
        <div className="step-indicator" role="list">
          {[1, 2, 3].map(n => {
            const cls = step === n ? 'active' : step > n ? 'done' : '';
            return (
              <React.Fragment key={n}>
                <div className={`step ${cls}`} role="listitem" aria-current={step === n ? 'step' : undefined}>
                  <div className="num">{step > n ? '✓' : n}</div>
                  <div className="label">
                    {n === 1 ? 'CONNECT' : n === 2 ? 'GRAPH' : 'CONFIRM'}
                  </div>
                </div>
                {n < 3 && <div className={`line ${step > n ? 'done' : ''}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {step === 1 && (
          <>
            <h2>Connect Wazuh</h2>
            <div className="sub">Paste this webhook URL into your Wazuh ossec.conf</div>
            <div className="copy-field">
              <div className="url">https://phishslayer.tech/api/webhooks/wazuh?token=wz_a3f928c...</div>
              <button className={`copy-btn ${copied ? 'done' : ''}`} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    onClick={handleTest} disabled={waiting}>
              {waiting ? 'Sending test alert...' : 'Send test alert'}
            </button>
            <div className={`status-line ${waiting ? 'waiting' : success ? 'success' : ''}`} aria-live="polite">
              <span className="dot" />
              {waiting ? 'Waiting for ping... (28s)' : success ? '✓ Connected — alert received' : 'Waiting for ping...'}
            </div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    disabled={!success}
                    onClick={() => setStep(2)}>
              Continue <IArrowRight size={13} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Connect Microsoft 365 <span style={{ color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 400 }}>· optional</span></h2>
            <div className="sub">Enables identity anomaly detection and L2 remediation tools (Graph)</div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                    onClick={() => setStep(3)}>
              Connect Microsoft 365
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: 'var(--text-tertiary)', fontSize: 11 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bg-border)' }} />
              <span>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--bg-border)' }} />
            </div>
            <button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setStep(3)}>
              Skip Microsoft Graph for now <IArrowRight size={13} />
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Ready to go</h2>
            <div className="sub">Your SOC is now active. PhishSlayer will start triaging incoming alerts.</div>
            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <Row label="Wazuh"            value="Connected"   ok />
              <Row label="Microsoft Graph"  value="Skipped"      muted />
              <Row label="Plan"             value="SOC Pro · $299/mo" />
            </div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                    onClick={onComplete}>
              Go to dashboard <IArrowRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, ok, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: ok ? '#86EFAC' : muted ? 'var(--text-tertiary)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {ok && '✓ '}{value}
      </span>
    </div>
  );
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsScreen() {
  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <div className="subtitle">Integrations · billing · webhooks</div>
        </div>
      </header>
      <div className="settings-page">
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

        <div className="settings-card">
          <div className="head">
            <h3>Microsoft Graph</h3>
            <span className="pill">Connected</span>
          </div>
          <div className="meta">Tenant: contoso.onmicrosoft.com</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 10 }}>
            {['User.Read.All', 'AuditLog.Read.All', 'Directory.Read.All', 'IdentityRiskEvent.Read.All'].map(s => (
              <span key={s} style={{ padding: '3px 8px', background: 'var(--bg-elevated)', borderRadius: 4, color: 'var(--text-secondary)' }}>{s}</span>
            ))}
          </div>
          <div className="actions">
            <button className="btn">Re-authorize</button>
            <button className="btn ghost danger">Disconnect</button>
          </div>
        </div>

        <div className="settings-card">
          <div className="head">
            <h3>Polar Billing</h3>
            <span className="pill" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-400)' }}>SOC Pro</span>
          </div>
          <div className="meta">$299/mo · Renews June 6, 2026 · 312/500 alerts today (62%)</div>
          <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 999, marginTop: 4, marginBottom: 12 }}>
            <div style={{ width: '62%', height: '100%', background: 'var(--accent-500)', borderRadius: 999 }} />
          </div>
          <div className="actions">
            <button className="btn primary">Upgrade to Command Center</button>
            <button className="btn">Manage billing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AlertQueueScreen, HuntScreen, MetricsScreen, EvolutionScreen,
  OnboardingScreen, SettingsScreen,
});
