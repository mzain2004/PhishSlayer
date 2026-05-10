// components.jsx — shared atoms & molecules used across PhishSlayer screens.

// ── Severity / status badges ─────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  return (
    <span className={`sev-badge ${severity}`} aria-label={`Severity ${severity}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }) {
  const showDot = status === 'triaging';
  const labelMap = {
    triaging: 'TRIAGING',
    escalated: 'ESCALATED',
    responded: 'RESPONDED',
    closed: 'CLOSED',
    fp: 'FALSE POSITIVE',
    pending: 'PENDING',
  };
  return (
    <span className={`status-badge ${status}`} aria-label={`Status ${labelMap[status] || status}`}>
      {showDot && <span className="pulse-dot" />}
      {labelMap[status] || status}
    </span>
  );
}

// ── Confidence bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ score, width = 64 }) {
  const level = confLevel(score);
  if (score == null) {
    return (
      <span className="conf-bar" aria-label="Confidence not yet computed">
        <span className="track"><span className="fill" style={{ width: 0 }} /></span>
        <span className="num empty">—</span>
      </span>
    );
  }
  return (
    <span className="conf-bar" aria-label={`Confidence ${score.toFixed(2)}`}>
      <span className="track" style={{ width }}>
        <span className={`fill ${level}`} style={{ width: `${score * 100}%` }} />
      </span>
      <span className="num">{score.toFixed(2)}</span>
    </span>
  );
}

// ── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const map = {
    free:        { cls: 'free',       label: 'FREE' },
    'soc-pro':   { cls: 'soc-pro',    label: 'SOC PRO' },
    'cmd-center':{ cls: 'cmd-center', label: 'CMD CENTER' },
  };
  const t = map[tier] || map.free;
  return <span className={`tier-badge ${t.cls}`}>{t.label}</span>;
}

// ── Blast radius diagram ─────────────────────────────────────────────────────
function BlastRadiusDiagram({ radius }) {
  const order = ['user', 'device', 'org', 'tenant'];
  const idx = order.indexOf(radius);
  const colors = {
    user:   '#22C55E',
    device: '#EAB308',
    org:    '#F97316',
    tenant: '#EF4444',
  };
  // Concentric circles. Outer→inner: tenant, org, device, user
  const layers = [
    { key: 'tenant', r: 56, color: colors.tenant, label: 'TENANT' },
    { key: 'org',    r: 42, color: colors.org,    label: 'ORG' },
    { key: 'device', r: 28, color: colors.device, label: 'DEVICE' },
    { key: 'user',   r: 14, color: colors.user,   label: 'USER' },
  ];

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={`Blast radius: ${radius}`}>
      <defs>
        <radialGradient id="brg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#brg)" />
      {layers.map((l, i) => {
        // ring is "affected" if it's at or inside the chosen radius level
        const layerIdx = order.indexOf(l.key);
        const affected = layerIdx <= idx;
        return (
          <g key={l.key}>
            <circle cx="60" cy="60" r={l.r}
                    fill={affected ? `${l.color}26` : 'transparent'}
                    stroke={l.color}
                    strokeWidth={affected ? 1.5 : 1}
                    strokeOpacity={affected ? 0.9 : 0.18}
                    strokeDasharray={affected ? 'none' : '2 3'} />
          </g>
        );
      })}
      {/* Affected label badge under */}
      <g transform="translate(60 110)">
        <text textAnchor="middle" fontFamily="Space Grotesk, Inter, sans-serif"
              fontSize="9" fontWeight="700" letterSpacing="1.2"
              fill={colors[radius]}>
          {radius.toUpperCase()}
        </text>
      </g>
      {/* Center dot */}
      <circle cx="60" cy="60" r="3" fill={colors[radius]} />
    </svg>
  );
}

// ── False-positive bar ───────────────────────────────────────────────────────
function FalsePositiveBar({ probability }) {
  const pct = Math.round(probability * 100);
  let color = '#22C55E';
  if (probability >= 0.5) color = '#EF4444';
  else if (probability >= 0.2) color = '#EAB308';
  return (
    <div className="fp-block">
      <div className="label">
        <span>False positive probability</span>
        <span className="pct" style={{ color }}>{pct}%</span>
      </div>
      <div className="fp-bar">
        <div className="fp-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Trace item (collapsible) ─────────────────────────────────────────────────
function TraceItem({ item, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const isRunning = item.status === 'running';
  return (
    <div className={`trace-row ${open ? 'open' : ''}`}>
      <button className="trace-head" onClick={() => setOpen(o => !o)}>
        <IChevRight size={10} className="chev" />
        <span className="tool">{item.tool}</span>
        {!isRunning && <span className="duration">{item.duration_ms}ms</span>}
        {isRunning
          ? <span className="status run">⟳</span>
          : <span className="status ok">✓</span>}
      </button>
      <div className="trace-body">
        <div className="kv">
          <span className="k">Input:</span>
          <span className="v"><span className="hl">{item.input}</span></span>
        </div>
        {item.result && (
          <div className="kv">
            <span className="k">Result:</span>
            <span className="v">{Object.entries(item.result).map(([k, v], i, arr) => {
              const cls = (k.includes('score') || k.includes('confidence')) ? 'num'
                        : (k === 'verdict' && v === 'malicious') ? 'high'
                        : '';
              return (
                <React.Fragment key={k}>
                  {k}: <span className={cls}>{String(v)}</span>{i < arr.length - 1 && ', '}
                </React.Fragment>
              );
            })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ kind = 'info', children }) {
  return (
    <div className={`toast ${kind}`}>
      {kind === 'critical' && <IAlert size={14} style={{ color: 'var(--severity-critical)' }} />}
      {kind === 'success'  && <ICheck size={14} style={{ color: 'var(--status-closed)' }} />}
      <span>{children}</span>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 28, color = 'var(--accent-500)' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = (max - min) || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const areaPath = path + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]}
              r="2.5" fill={color} />
    </svg>
  );
}

Object.assign(window, {
  SeverityBadge, StatusBadge, ConfidenceBar, TierBadge,
  BlastRadiusDiagram, FalsePositiveBar, TraceItem, Toast, Sparkline,
});
