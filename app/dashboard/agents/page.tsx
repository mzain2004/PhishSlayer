'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useEffect, useState } from 'react';
import { IChart, ISettings } from '@/components/ui/icons';

interface AgentConfig {
  threshold: number;
  blast_limit: string;
  maintenance: boolean;
  rag: boolean;
}

interface AgentStats {
  processed: number;
  latency: string;
  tokens: string;
  conf_avg: string;
}

interface Agent {
  id: string;
  level: string;
  name: string;
  sub: string;
  status: string;
  color: string;
  icon: string;
  stats: AgentStats;
  description: string;
  config: AgentConfig;
}

const AGENT_DEFS: Agent[] = [
  {
    id: 'l1', level: 'L1', name: 'L1 Triage', sub: 'First-pass classifier',
    status: 'running', color: 'l1', icon: '⚡',
    stats: { processed: 247, latency: '3.2s', tokens: '1,240', conf_avg: '0.84' },
    description: 'Enriches every incoming alert with threat intelligence lookups, RAG context, and a go/no-go escalation decision.',
    config: { threshold: 0.72, blast_limit: 'device', maintenance: false, rag: true },
  },
  {
    id: 'l2', level: 'L2', name: 'L2 Responder', sub: 'Remediation orchestrator',
    status: 'running', color: 'l2', icon: '🛡',
    stats: { processed: 89, latency: '11.4s', tokens: '3,890', conf_avg: '0.91' },
    description: 'Executes remediation playbooks (session revoke, MFA push, IP block) and gates blast-radius actions on human approval.',
    config: { threshold: 0.87, blast_limit: 'org', maintenance: false, rag: true },
  },
  {
    id: 'l3', level: 'L3', name: 'L3 Hunter', sub: 'Deep investigation',
    status: 'running', color: 'l3', icon: '🔬',
    stats: { processed: 14, latency: '67s', tokens: '8,240', conf_avg: '0.89' },
    description: 'Runs Reader → Hunter → Reviewer pipeline for complex threat-hunting campaigns, producing full IOC graphs and MITRE-mapped reports.',
    config: { threshold: 0.85, blast_limit: 'tenant', maintenance: false, rag: true },
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(AGENT_DEFS);
  const [selectedAgent, setSelectedAgent] = useState('l1');

  useEffect(() => {
    fetch('/api/agents/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.agents?.length) setAgents(d.agents); })
      .catch(() => {});
  }, []);

  const update = (id: string, key: keyof AgentConfig, val: AgentConfig[keyof AgentConfig]) =>
    setAgents(prev => prev.map(a => a.id === id ? { ...a, config: { ...a.config, [key]: val } } : a));

  const agent = agents.find(a => a.id === selectedAgent);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <header className="page-header">
        <div>
          <h1>Agents</h1>
          <div className="subtitle">3 agents active · all healthy</div>
        </div>
      </header>

      <div className="agents-cards">
        {agents.map(a => (
          <div key={a.id} className="agent-card"
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
                <span style={{ color: '#86EFAC' }}>≥0.85</span> auto ·{' '}
                <span style={{ color: '#FDE047' }}>0.60–0.85</span> review ·{' '}
                <span style={{ color: '#FCA5A5' }}>&lt;0.60</span> escalate
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
