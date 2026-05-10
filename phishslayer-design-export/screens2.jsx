// screens2.jsx — IOCs, Reports, Agents, Integrations screens

// ── IOCs SCREEN ──────────────────────────────────────────────────────────────
const IOC_DATA = [
  { id: 'ioc-001', indicator: '185.220.101.42', type: 'IP',     confidence: 0.94, severity: 'critical',
    first_seen: '2026-05-08 04:12',  last_seen: '2026-05-10 12:31',
    sources: ['VirusTotal','AbuseIPDB','Shodan'], hits: 8,
    raw: { vt_score: '47/72', abuse_conf: '89%', country: 'RU', asn: 'AS60781 LeaseWeb' },
    related_alerts: ['3f92a1c0','4d8c2a91'], tags: ['Tor exit','APT-41','cred-stuffing'] },
  { id: 'ioc-002', indicator: 'kit-2024.tld',  type: 'Domain', confidence: 0.91, severity: 'critical',
    first_seen: '2026-05-07 18:40',  last_seen: '2026-05-10 11:18',
    sources: ['URLScan','PhishTank','GreyNoise'], hits: 5,
    raw: { urlscan: 'phishing-kit fingerprint match', registrar: 'Namesilo', created: '2026-04-29' },
    related_alerts: ['3f92a1c0'], tags: ['phishing-kit','credential-harvest'] },
  { id: 'ioc-003', indicator: '3f924e51c0a8b...d792', type: 'Hash',   confidence: 0.96, severity: 'critical',
    first_seen: '2026-05-06 09:01',  last_seen: '2026-05-10 08:44',
    sources: ['VirusTotal','MalwareBazaar'], hits: 11,
    raw: { vt_score: '62/72', family: 'AgentTesla', packer: 'UPX' },
    related_alerts: ['4d8c2a91','3f92a1c0'], tags: ['infostealer','AgentTesla'] },
  { id: 'ioc-004', indicator: '45.33.32.156',  type: 'IP',     confidence: 0.71, severity: 'high',
    first_seen: '2026-05-09 22:14',  last_seen: '2026-05-10 12:29',
    sources: ['AbuseIPDB','Shodan'], hits: 3,
    raw: { abuse_conf: '62%', open_ports: '22,80,443', country: 'DE' },
    related_alerts: ['8a2bf013'], tags: ['brute-force','scanning'] },
  { id: 'ioc-005', indicator: 'associated-domain.cc', type: 'Domain', confidence: 0.88, severity: 'high',
    first_seen: '2026-05-08 11:22',  last_seen: '2026-05-10 10:05',
    sources: ['URLScan','WHOIS'], hits: 5,
    raw: { redirect_chain: '→198.51.100.4→kit-2024.tld', registrar: 'GoDaddy', created: '2026-04-21' },
    related_alerts: ['3f92a1c0'], tags: ['redirect','phishing'] },
  { id: 'ioc-006', indicator: '198.51.100.4',  type: 'IP',     confidence: 0.78, severity: 'high',
    first_seen: '2026-05-08 13:00',  last_seen: '2026-05-10 09:18',
    sources: ['GreyNoise','Shodan'], hits: 3,
    raw: { greyNoise: 'internet scanner', open_ports: '80,443', country: 'NL' },
    related_alerts: ['3f92a1c0'], tags: ['scanner','relay'] },
  { id: 'ioc-007', indicator: 'j.okeefe@contoso.com', type: 'Email',  confidence: 0.61, severity: 'medium',
    first_seen: '2026-05-10 11:30',  last_seen: '2026-05-10 12:05',
    sources: ['HIBP','Internal SIEM'], hits: 2,
    raw: { hibp_breaches: 'LinkedIn2021,Adobe2022', internal: 'OAuth anomaly' },
    related_alerts: ['b71e8f24'], tags: ['compromised-creds','OAuth'] },
];

function IOCsScreen() {
  const [expandedId, setExpandedId] = React.useState(null);
  const [filterType, setFilterType] = React.useState('all');
  const [filterSev, setFilterSev] = React.useState('all');
  const [filterConf, setFilterConf] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const filtered = IOC_DATA.filter(ioc => {
    if (filterType !== 'all' && ioc.type.toLowerCase() !== filterType) return false;
    if (filterSev  !== 'all' && ioc.severity !== filterSev) return false;
    if (filterConf === 'high'   && ioc.confidence < 0.85) return false;
    if (filterConf === 'medium' && (ioc.confidence < 0.6 || ioc.confidence >= 0.85)) return false;
    if (filterConf === 'low'    && ioc.confidence >= 0.6) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!ioc.indicator.toLowerCase().includes(q) && !ioc.tags.some(t => t.includes(q))) return false;
    }
    return true;
  });

  const counts = { ip: IOC_DATA.filter(i => i.type === 'IP').length, domain: IOC_DATA.filter(i => i.type === 'Domain').length, hash: IOC_DATA.filter(i => i.type === 'Hash').length, email: IOC_DATA.filter(i => i.type === 'Email').length };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>IOCs</h1>
          <div className="subtitle">
            <span style={{ color: 'var(--text-primary)' }}>{IOC_DATA.length} indicators</span>
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
            <React.Fragment key={ioc.id}>
              <tr
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
                <tr>
                  <td colSpan="9" style={{ padding: 0 }}>
                    <IOCExpanded ioc={ioc} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IOCExpanded({ ioc }) {
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

function IOCFilterPill({ label, value, options, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
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
                border: 0, color: value === val ? 'var(--accent-400)' : 'var(--text-secondary)', borderRadius: 4 }}>
              {lab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── REPORTS SCREEN ───────────────────────────────────────────────────────────
const REPORT_DATA = [
  { id: 'r001', name: 'Weekly Executive Briefing',         type: 'executive',   date: '2026-05-10', alerts: 247, size: '1.2 MB',
    desc: 'High-level summary of threat landscape, MTTR trends, and top incidents for leadership.' },
  { id: 'r002', name: 'APT-41 Campaign Deep-Dive',         type: 'threat-intel', date: '2026-05-10', alerts: 12,  size: '3.8 MB',
    desc: 'Full technical breakdown of APT-41 credential harvesting campaign targeting M365.' },
  { id: 'r003', name: 'ISO 27001 Compliance Audit',        type: 'compliance',  date: '2026-05-08', alerts: 98,  size: '2.1 MB',
    desc: 'Automated compliance evidence export covering all active controls for auditors.' },
  { id: 'r004', name: 'Daily Ops Report — May 9',          type: 'technical',   date: '2026-05-09', alerts: 219, size: '0.8 MB',
    desc: 'Full incident log with agent decisions, latency breakdown, and FP analysis.' },
  { id: 'r005', name: 'Credential Stuffing Postmortem',    type: 'technical',   date: '2026-05-07', alerts: 6,   size: '1.5 MB',
    desc: 'Root cause analysis and timeline reconstruction for the May 7 stuffing wave.' },
  { id: 'r006', name: 'SOC KPI Monthly Summary — April',   type: 'executive',   date: '2026-04-30', alerts: 2810, size: '0.9 MB',
    desc: 'Monthly KPIs: MTTR, auto-close rate, agent performance, FP rate trends.' },
];

function ReportsScreen() {
  const [showModal, setShowModal] = React.useState(false);
  const [reportType, setReportType] = React.useState('executive');
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); setTimeout(() => setShowModal(false), 800); }, 1600);
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <div className="subtitle">{REPORT_DATA.length} reports · executive, technical &amp; compliance</div>
        </div>
        <button className="btn primary" onClick={() => { setShowModal(true); setGenerated(false); }}>
          <IPlus size={13} /> Generate report
        </button>
      </header>

      <div className="reports-grid">
        {REPORT_DATA.map(r => (
          <div key={r.id} className="report-card">
            <div className="rc-head">
              <h3 className="rc-title">{r.name}</h3>
              <span className={`rc-type ${r.type}`}>
                {r.type === 'threat-intel' ? 'THREAT INTEL' : r.type.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.desc}</div>
            <div className="rc-meta">
              <span>Generated: {r.date}</span>
              <span>Size: {r.size}</span>
            </div>
            <div className="rc-stats">
              <span><IShield size={11} style={{ color: 'var(--text-tertiary)' }} /> {r.alerts} alerts covered</span>
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

// ── AGENTS SCREEN ────────────────────────────────────────────────────────────
const AGENT_DEFS = [
  {
    id: 'l1', level: 'L1', name: 'L1 Triage', sub: 'First-pass classifier',
    status: 'running', color: 'l1',
    icon: '⚡',
    stats: { processed: 247, latency: '3.2s', tokens: '1,240', conf_avg: '0.84' },
    description: 'Enriches every incoming alert with threat intelligence lookups, RAG context, and a go/no-go escalation decision.',
    config: { threshold: 0.72, blast_limit: 'device', maintenance: false, rag: true },
  },
  {
    id: 'l2', level: 'L2', name: 'L2 Responder', sub: 'Remediation orchestrator',
    status: 'running', color: 'l2',
    icon: '🛡',
    stats: { processed: 89, latency: '11.4s', tokens: '3,890', conf_avg: '0.91' },
    description: 'Executes remediation playbooks (session revoke, MFA push, IP block) and gates blast-radius actions on human approval.',
    config: { threshold: 0.87, blast_limit: 'org', maintenance: false, rag: true },
  },
  {
    id: 'l3', level: 'L3', name: 'L3 Hunter', sub: 'Deep investigation',
    status: 'running', color: 'l3',
    icon: '🔬',
    stats: { processed: 14, latency: '67s', tokens: '8,240', conf_avg: '0.89' },
    description: 'Runs Reader → Hunter → Reviewer pipeline for complex threat-hunting campaigns, producing full IOC graphs and MITRE-mapped reports.',
    config: { threshold: 0.85, blast_limit: 'tenant', maintenance: false, rag: true },
  },
];

function AgentsScreen() {
  const [agents, setAgents] = React.useState(AGENT_DEFS);
  const [selectedAgent, setSelectedAgent] = React.useState('l1');

  const update = (id, key, val) =>
    setAgents(prev => prev.map(a => a.id === id ? { ...a, config: { ...a.config, [key]: val } } : a));

  const agent = agents.find(a => a.id === selectedAgent);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Agents</h1>
          <div className="subtitle">3 agents active · all healthy</div>
        </div>
      </header>

      <div className="agents-cards">
        {agents.map(a => (
          <div key={a.id} className={`agent-card ${selectedAgent === a.id ? '' : ''}`}
               style={selectedAgent === a.id ? { borderColor: 'rgba(99,102,241,0.4)', boxShadow: '0 0 0 1px rgba(99,102,241,0.15)' } : {}}>
            <div className="ac-head">
              <div className={`ac-icon ${a.color}`}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="ac-name">{a.name}</div>
                <div className="ac-sub">{a.sub}</div>
              </div>
              <span className={`ac-status ${a.status}`}>
                <span className="status-dot" />
                {a.status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.description}</div>
            <div className="ac-stats">
              <div className="ac-stat">
                <div className="s-label">Processed</div>
                <div className="s-val">{a.stats.processed}</div>
                <div className="s-sub">alerts today</div>
              </div>
              <div className="ac-stat">
                <div className="s-label">Avg latency</div>
                <div className="s-val">{a.stats.latency}</div>
                <div className="s-sub">per alert</div>
              </div>
              <div className="ac-stat">
                <div className="s-label">Tokens/alert</div>
                <div className="s-val" style={{ fontSize: 16 }}>{a.stats.tokens}</div>
                <div className="s-sub">avg</div>
              </div>
              <div className="ac-stat">
                <div className="s-label">Conf avg</div>
                <div className="s-val" style={{ color: parseFloat(a.stats.conf_avg) >= 0.85 ? '#86EFAC' : '#FDE047' }}>
                  {a.stats.conf_avg}
                </div>
                <div className="s-sub">last 100 alerts</div>
              </div>
            </div>
            <div className="ac-actions">
              <button className="btn" onClick={() => setSelectedAgent(a.id)}
                      style={selectedAgent === a.id ? { color: 'var(--accent-400)', borderColor: 'rgba(99,102,241,0.4)' } : {}}>
                <ISettings size={12} /> Configure
              </button>
              <button className="btn ghost"><IChart size={12} /> Traces</button>
            </div>
          </div>
        ))}
      </div>

      {agent && (
        <div className="agent-config" style={{ marginTop: 20 }}>
          <div className="config-head">
            <span style={{ fontFamily: 'var(--font-display)' }}>{agent.name} — Configuration</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
              Changes apply to new alerts only
            </span>
          </div>
          <div className="config-body">
            <div className="config-field">
              <div className="cf-label">Confidence threshold</div>
              <div className="cf-desc">Minimum score to auto-execute without human approval.</div>
              <div className="config-slider-wrap">
                <input type="range" className="config-slider" min="0.5" max="0.99" step="0.01"
                       value={agent.config.threshold}
                       onChange={e => update(agent.id, 'threshold', parseFloat(e.target.value))} />
                <span className="config-val">{agent.config.threshold.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                <span style={{ color: '#86EFAC' }}>≥0.85</span> auto · <span style={{ color: '#FDE047' }}>0.60–0.85</span> review · <span style={{ color: '#FCA5A5' }}>&lt;0.60</span> escalate
              </div>
            </div>

            <div className="config-field">
              <div className="cf-label">Max blast radius</div>
              <div className="cf-desc">Hard ceiling on autonomous action scope.</div>
              <select style={{ padding: '8px 12px', background: 'var(--bg-elevated)',
                              border: '1px solid var(--bg-border)', borderRadius: 7,
                              color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13 }}
                      value={agent.config.blast_limit}
                      onChange={e => update(agent.id, 'blast_limit', e.target.value)}>
                <option value="user">User — contained</option>
                <option value="device">Device — single endpoint</option>
                <option value="org">Org — department</option>
                <option value="tenant">Tenant — entire org</option>
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Actions above this scope require human approval.
              </div>
            </div>

            <div className="config-field" style={{ gap: 14 }}>
              <div className="cf-label">Options</div>
              <div className="toggle-row">
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>RAG context lookup</div>
                  <div className="cf-desc">Enable knowledge-base augmentation per alert.</div>
                </div>
                <button className={`toggle-switch ${agent.config.rag ? 'on' : ''}`}
                        onClick={() => update(agent.id, 'rag', !agent.config.rag)}>
                  <i />
                </button>
              </div>
              <div className="toggle-row">
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Maintenance window</div>
                  <div className="cf-desc">Pause agent between 02:00–04:00 UTC.</div>
                </div>
                <button className={`toggle-switch ${agent.config.maintenance ? 'on' : ''}`}
                        onClick={() => update(agent.id, 'maintenance', !agent.config.maintenance)}>
                  <i />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INTEGRATIONS SCREEN ──────────────────────────────────────────────────────
const INTEGRATIONS = [
  { cat: 'OSINT & Threat Intel', tools: [
    { id: 'vt',         name: 'VirusTotal',    icon: '🦠', desc: 'File, URL and IP reputation lookups', status: 'using-ps', l: 'Using PhishSlayer key' },
    { id: 'shodan',     name: 'Shodan',         icon: '🔭', desc: 'Internet-wide asset and port scanning', status: 'using-own', l: 'Using your key' },
    { id: 'abuseipdb',  name: 'AbuseIPDB',      icon: '🌐', desc: 'IP abuse confidence and history',   status: 'using-ps', l: 'Using PhishSlayer key' },
    { id: 'greynoise',  name: 'GreyNoise',       icon: '📡', desc: 'Background noise vs. targeted threats', status: 'unconfigured', l: 'Not configured' },
    { id: 'hibp',       name: 'HaveIBeenPwned',  icon: '🔓', desc: 'Email & domain breach history',    status: 'unconfigured', l: 'Not configured' },
    { id: 'urlscan',    name: 'URLScan.io',       icon: '🔗', desc: 'URL scanning and phishing detection', status: 'using-ps', l: 'Using PhishSlayer key' },
  ]},
  { cat: 'Security Platforms', tools: [
    { id: 'wazuh',      name: 'Wazuh',           icon: '🛡', desc: 'SIEM/HIDS — primary alert source',   status: 'using-own', l: 'Connected via webhook' },
    { id: 'msgraph',    name: 'Microsoft Graph',  icon: '☁️', desc: 'M365 identity + audit log access',   status: 'using-own', l: 'OAuth connected' },
    { id: 'sentinelone',name: 'SentinelOne',      icon: '🤖', desc: 'EDR telemetry and isolation actions', status: 'unconfigured', l: 'Not configured' },
    { id: 'crowdstrike',name: 'CrowdStrike',      icon: '🦅', desc: 'Falcon telemetry and containment',   status: 'unconfigured', l: 'Not configured' },
  ]},
  { cat: 'Communication', tools: [
    { id: 'slack',      name: 'Slack',            icon: '💬', desc: 'Alert notifications and approvals',   status: 'using-own', l: 'Using your webhook' },
    { id: 'pagerduty',  name: 'PagerDuty',         icon: '📟', desc: 'On-call escalation and incidents',    status: 'unconfigured', l: 'Not configured' },
    { id: 'teams',      name: 'Microsoft Teams',   icon: '🟦', desc: 'Teams channel notifications',         status: 'unconfigured', l: 'Not configured' },
  ]},
  { cat: 'Ticketing & Workflow', tools: [
    { id: 'jira',       name: 'Jira',             icon: '📋', desc: 'Auto-create tickets from escalations', status: 'unconfigured', l: 'Not configured' },
    { id: 'linear',     name: 'Linear',            icon: '◉', desc: 'Issue tracking for security tasks',     status: 'unconfigured', l: 'Not configured' },
    { id: 'servicenow', name: 'ServiceNow',        icon: '🔧', desc: 'ITSM integration for enterprise SOCs', status: 'unconfigured', l: 'Not configured' },
  ]},
];

function IntegrationsScreen() {
  const [keyModal, setKeyModal] = React.useState(null); // { name, id }
  const [keyVal, setKeyVal] = React.useState('');
  const [saved, setSaved] = React.useState(new Set());

  const handleSave = () => {
    if (!keyVal.trim()) return;
    setSaved(s => new Set([...s, keyModal.id]));
    setKeyModal(null); setKeyVal('');
  };

  const configured = INTEGRATIONS.flatMap(c => c.tools).filter(t => t.status !== 'unconfigured').length;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Integrations</h1>
          <div className="subtitle">
            <span style={{ color: 'var(--text-primary)' }}>{configured} connected</span>
            {' · '}
            <span>{INTEGRATIONS.flatMap(c => c.tools).length - configured} available</span>
          </div>
        </div>
      </header>

      <div className="integrations-page">
        {INTEGRATIONS.map(cat => (
          <div key={cat.cat} className="integration-category">
            <h3>{cat.cat}</h3>
            <div className="integration-cards">
              {cat.tools.map(tool => {
                const isSaved = saved.has(tool.id);
                const status = isSaved ? 'using-own' : tool.status;
                return (
                  <div key={tool.id} className={`integration-card ${status !== 'unconfigured' ? 'active' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="ic-logo">{tool.icon}</div>
                      <span className={`int-status ${status}`}>
                        {status === 'using-ps' ? 'PS KEY' : status === 'using-own' ? 'CONNECTED' : 'NOT SET'}
                      </span>
                    </div>
                    <div className="ic-name">{tool.name}</div>
                    <div className="ic-desc">{tool.desc}</div>
                    <div className="ic-actions">
                      {status === 'unconfigured' ? (
                        <button className="btn primary" style={{ fontSize: 12 }}
                                onClick={() => { setKeyModal(tool); setKeyVal(''); }}>
                          <IPlus size={11} /> Add key
                        </button>
                      ) : (
                        <>
                          <button className="btn ghost" style={{ fontSize: 11 }}
                                  onClick={() => { setKeyModal(tool); setKeyVal(''); }}>
                            Rotate key
                          </button>
                          <button className="btn ghost" style={{ fontSize: 11, color: '#FCA5A5' }}>
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {keyModal && (
        <div className="modal-backdrop" onClick={() => setKeyModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{keyModal.icon}</span>
                {keyModal.name}
              </span>
              <button className="btn ghost" style={{ padding: '2px 6px' }} onClick={() => setKeyModal(null)}>
                <IX size={13} />
              </button>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {keyModal.desc}. Your key is stored encrypted and never logged.
            </div>
            <span className="key-modal-label">API Key (write-only)</span>
            <div className="key-input-wrap">
              <input
                type="password"
                value={keyVal}
                onChange={e => setKeyVal(e.target.value)}
                placeholder={`${keyModal.name.toLowerCase().replace(/\s/g,'-')}_xxxxxxxxxxxxxxxx`}
                autoFocus
              />
            </div>
            <div className="key-hint">
              🔒 Key is encrypted at rest with AES-256. Cannot be viewed after saving.
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setKeyModal(null)}>Cancel</button>
              <button className="btn primary" onClick={handleSave} disabled={!keyVal.trim()}>
                Save key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  IOCsScreen, ReportsScreen, AgentsScreen, IntegrationsScreen,
});
