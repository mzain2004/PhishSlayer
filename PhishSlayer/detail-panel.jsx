// detail-panel.jsx — slide-in alert detail panel with timeline, traces, and consequence panel.

function DetailPanel({ alert, open, onClose, onApprove, onReject, onOpenHunt }) {
  const [l2Streamed, setL2Streamed] = React.useState(0); // index of last visible L2 trace
  const [showRollback, setShowRollback] = React.useState(false);
  const [twoPersonState, setTwoPersonState] = React.useState('idle'); // idle|first|done
  const [approvalState, setApprovalState] = React.useState('idle'); // idle|loading|approved|rejected
  const panelRef = React.useRef(null);

  // Reset stream + approval when alert changes
  React.useEffect(() => {
    setL2Streamed(0);
    setShowRollback(false);
    setTwoPersonState('idle');
    setApprovalState('idle');
  }, [alert?.id]);

  // Stream L2 trace items in for the hero alert
  React.useEffect(() => {
    if (!open || !alert) return undefined;
    const isHero = alert.id === '3f92a1c0';
    if (!isHero) return undefined;
    const total = SEED_TRACE_L2.length;
    let i = 0;
    const tick = () => {
      i += 1;
      setL2Streamed(i);
      if (i < total) {
        const next = setTimeout(tick, 900 + Math.random() * 700);
        timerRef.current = next;
      }
    };
    const timerRef = { current: setTimeout(tick, 1200) };
    return () => clearTimeout(timerRef.current);
  }, [open, alert?.id]);

  // Esc closes
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!alert) {
    return (
      <>
        <div className={`backdrop ${open ? 'open' : ''}`} onClick={onClose} />
        <aside ref={panelRef} className={`detail-panel ${open ? 'open' : ''}`} role="dialog" aria-hidden={!open} />
      </>
    );
  }

  const isStreaming = alert.id === '3f92a1c0' && l2Streamed < SEED_TRACE_L2.length;
  const visibleL2 = SEED_TRACE_L2.slice(0, l2Streamed);
  const showConsequence = alert.proposed_action && alert.status !== 'closed' && alert.status !== 'fp' && approvalState !== 'approved' && approvalState !== 'rejected';

  const handleApprove = () => {
    if (alert.blast_radius === 'org' || alert.blast_radius === 'tenant') {
      // Two-person flow: first approval recorded, second still needed
      if (twoPersonState === 'idle') {
        setTwoPersonState('first');
        return;
      }
    }
    setApprovalState('loading');
    setTimeout(() => {
      setApprovalState('approved');
      onApprove?.(alert);
    }, 700);
  };

  const handleReject = () => {
    setApprovalState('loading');
    setTimeout(() => {
      setApprovalState('rejected');
      onReject?.(alert);
    }, 500);
  };

  return (
    <>
      <div className={`backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside
        ref={panelRef}
        className={`detail-panel ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        aria-hidden={!open}
      >
        <div className="detail-header">
          <div className="actions">
            <button className="btn ghost" onClick={onClose} aria-label="Close">
              <IChevLeft size={14} /> Back
            </button>
            <span className="alert-id">ALERT #{alert.id}</span>
            <button className="btn ghost" aria-label="Open in full page">
              <IExpand size={13} />
            </button>
          </div>
          <div className="title-row">
            <h2 id="detail-title">{alert.attack}</h2>
            <SeverityBadge severity={alert.severity} />
          </div>
          <div className="target-line">
            <span>{alert.src_ip}</span>
            <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>→</span>
            <span>{alert.target}</span>
          </div>
          <div className="meta-line">
            <span>{alert.country}</span>
            <span>·</span>
            <span>{ageString(alert.age_seconds)} old</span>
            <span>·</span>
            <StatusBadge status={alert.status} />
          </div>
        </div>

        <div className="detail-body">
          {/* Timeline */}
          <section className="detail-section">
            <div className="sec-head"><span>Timeline</span></div>
            <div className="timeline">
              <TimelineRow time={alert.started_at} label="Ingested" done />
              <TimelineRow time={incrementTime(alert.started_at, 2)} label="L1 Started" done />
              {alert.confidence != null && (
                <TimelineRow
                  time={incrementTime(alert.started_at, 5)}
                  label="L1 Complete"
                  extra={`confidence ${alert.confidence.toFixed(2)}`}
                  done
                />
              )}
              {alert.status === 'escalated' || alert.id === '3f92a1c0' ? (
                <TimelineRow time={incrementTime(alert.started_at, 5)} label="L2 Escalated" done />
              ) : null}
              {alert.id === '3f92a1c0' && (
                <TimelineRow
                  time={incrementTime(alert.started_at, 7)}
                  label={isStreaming ? 'L2 Running' : 'L2 Complete'}
                  active={isStreaming}
                  done={!isStreaming}
                  extra={!isStreaming ? 'awaiting approval' : ''}
                />
              )}
            </div>
          </section>

          {/* L1 Trace */}
          {alert.id === '3f92a1c0' && (
            <section className="detail-section">
              <div className="sec-head">
                <span>L1 Trace</span>
                <span className="badge-chip">3.4s · 1,240 tokens</span>
              </div>
              <div className="trace">
                {SEED_TRACE_L1.map((t, i) => <TraceItem key={i} item={t} defaultOpen={i === 0} />)}
                <div className="trace-summary">
                  <span className="label">Confidence</span>
                  <ConfidenceBar score={0.71} width={120} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Decision: <span style={{ color: '#FDBA74' }}>ESCALATE → L2</span>
                  </span>
                  <button className="raw-link">[Raw JSON]</button>
                </div>
              </div>
            </section>
          )}

          {/* L2 Trace — streaming */}
          {alert.id === '3f92a1c0' && (
            <section className="detail-section">
              <div className="sec-head">
                <span>L2 Trace</span>
                {isStreaming
                  ? <span className="badge-chip live">streaming</span>
                  : <span className="badge-chip">11.4s · 3,890 tokens</span>}
              </div>
              <div className="trace">
                {visibleL2.map((t, i) => (
                  <TraceItem key={i} item={t} defaultOpen={i === visibleL2.length - 1} />
                ))}
                {isStreaming && (
                  <div className="trace-row">
                    <div className="trace-head">
                      <IChevRight size={10} className="chev" />
                      <span className="tool" style={{ color: 'var(--severity-medium)' }}>
                        {[ 'graph_get_signin_logs', 'graph_get_user_risk', 'wazuh_query_endpoint', 'rag_query_playbook' ][l2Streamed] || 'analyzing...'}
                      </span>
                      <span className="status run">⟳</span>
                    </div>
                    <div style={{ padding: '6px 12px 12px 30px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span className="streaming-cursor">running</span>
                    </div>
                  </div>
                )}
                {!isStreaming && (
                  <div className="trace-summary">
                    <span className="label">Confidence</span>
                    <ConfidenceBar score={0.89} width={120} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      Decision: <span style={{ color: 'var(--accent-400)' }}>HUMAN APPROVAL</span>
                    </span>
                  </div>
                )}
              </div>
              {isStreaming && (
                <div className="token-counter">{(visibleL2.length * 380 + 240).toLocaleString()} tokens used</div>
              )}
            </section>
          )}

          {/* Consequence Panel */}
          {showConsequence && !isStreaming && (
            <ConsequencePanel
              alert={alert}
              twoPersonState={twoPersonState}
              approvalState={approvalState}
              showRollback={showRollback}
              onToggleRollback={() => setShowRollback(s => !s)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {approvalState === 'approved' && (
            <div className="consequence" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
              <div className="head" style={{ color: '#86EFAC' }}>
                <ICheck size={14} /> Action approved
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Executing <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-400)' }}>{alert.proposed_action_short}</span>... will appear in incident log.
              </div>
            </div>
          )}

          {approvalState === 'rejected' && (
            <div className="consequence" style={{ background: 'rgba(107,114,128,0.08)', borderColor: 'var(--bg-border)' }}>
              <div className="head" style={{ color: 'var(--text-secondary)' }}>
                <IX size={14} /> Action rejected
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Alert marked for manual review. L2 trace preserved for audit.
              </div>
            </div>
          )}

          {/* Open Hunt link */}
          {alert.id === '3f92a1c0' && (
            <section className="detail-section" style={{ marginTop: 22 }}>
              <button className="btn" style={{ width: '100%', justifyContent: 'space-between' }}
                      onClick={onOpenHunt}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ICrosshair size={14} /> Open L3 Deep Hunt for this alert
                </span>
                <IArrowRight size={14} />
              </button>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

function TimelineRow({ time, label, extra, done, active }) {
  const cls = active ? 'active' : (done ? 'done' : '');
  return (
    <div className={`tl-row ${cls}`}>
      <div className="tl-dot" />
      <div className="tl-time">{time}</div>
      <div className="tl-label">
        <span>{label}</span>
        {extra && <span className="extra">· {extra}</span>}
      </div>
    </div>
  );
}

function ConsequencePanel({ alert, twoPersonState, approvalState, showRollback, onToggleRollback, onApprove, onReject }) {
  const radius = alert.blast_radius || 'user';
  const requiresTwo = radius === 'org' || radius === 'tenant';
  const isLoading = approvalState === 'loading';
  const blastLabel = {
    user: 'USER ONLY — contained impact',
    device: 'DEVICE — single endpoint affected',
    org: 'ORG — multiple users affected',
    tenant: 'TENANT — entire tenant affected',
  }[radius];

  return (
    <section className="detail-section">
      <div className="consequence">
        <div className="head"><IAlert size={13} /> Action required — L2 awaiting approval</div>
        <div className="desc">
          Proposed action: <span className="action">{alert.proposed_action_short || 'session.revoke'}</span>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-body)' }}>
            {alert.proposed_action}
          </div>
        </div>

        {requiresTwo && twoPersonState === 'first' && (
          <div className="two-person">
            <strong style={{ color: '#DDD6FE' }}>Awaiting 2nd approval</strong>
            <div style={{ marginTop: 4 }}>This action affects the entire {radius}. A second analyst must also approve.</div>
            <div className="chip"><ILock size={10} /> 1/2 approvals · waiting for colleague</div>
          </div>
        )}

        <div className="grid">
          <div className="blast-block">
            <div className="blast-label">Blast radius</div>
            <div className="blast-svg"><BlastRadiusDiagram radius={radius} /></div>
            <div className="blast-legend"><strong>{blastLabel}</strong></div>
          </div>
          <div className="right-col">
            <FalsePositiveBar probability={alert.fp_probability ?? 0.2} />
            {alert.side_effects && (
              <div className="effects">
                <div className="blast-label" style={{ marginBottom: 4 }}>Side effects</div>
                <ul>{alert.side_effects.map((s, i) => <li key={i}><span>{s}</span></li>)}</ul>
              </div>
            )}
            <div>
              <button className="rollback-toggle" onClick={onToggleRollback}>
                <IChevRight size={9} style={{ display: 'inline', transform: showRollback ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
                {' '}Show rollback steps {alert.rollback_steps ? `(${alert.rollback_steps.length})` : ''}
              </button>
              {showRollback && alert.rollback_steps && (
                <ol style={{ paddingLeft: 18, margin: '6px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {alert.rollback_steps.map((s, i) => <li key={i} style={{ padding: '2px 0' }}>{s}</li>)}
                </ol>
              )}
            </div>
          </div>
        </div>

        <div className="approval-row">
          <button
            className="approve"
            onClick={onApprove}
            disabled={isLoading || (requiresTwo && twoPersonState === 'first')}
            aria-label={`Approve action: ${alert.proposed_action}`}
          >
            {requiresTwo && twoPersonState === 'first'
              ? <><ILock size={13} /> Awaiting 2nd</>
              : isLoading ? 'Executing...' : <><ICheck size={14} /> Approve</>}
          </button>
          <button className="reject" onClick={onReject} disabled={isLoading}>
            <IX size={13} /> Reject
          </button>
        </div>

        {alert.recovery_time && (
          <div className="recovery">Recovery time estimate: {alert.recovery_time}</div>
        )}
      </div>
    </section>
  );
}

function incrementTime(start, secs) {
  if (!start || start === 'now') return '—';
  const [h, m, s] = start.split(':').map(Number);
  const totalSec = h * 3600 + m * 60 + s + secs;
  const hh = String(Math.floor(totalSec / 3600) % 24).padStart(2, '0');
  const mm = String(Math.floor(totalSec / 60) % 60).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

Object.assign(window, { DetailPanel });
