'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useState } from 'react';
import { toast } from 'sonner';
import { ICrosshair } from '@/components/ui/icons';

type Status = 'idle' | 'starting' | 'started' | 'error';

export default function HuntingPage() {
  const [ioc, setIoc] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [huntId, setHuntId] = useState<string | null>(null);

  const onStart = async () => {
    const value = ioc.trim();
    if (!value) {
      toast.error('Enter an IOC to start a hunt');
      return;
    }
    setStatus('starting');
    try {
      const res = await fetch('/api/hunting/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ioc: value }),
      });
      if (!res.ok) {
        setStatus('error');
        toast.error('Could not start hunt. Try again shortly.');
        return;
      }
      const data = await res.json().catch(() => null);
      const id = data?.hunt_id ?? data?.id ?? data?.data?.id ?? null;
      setHuntId(id ? String(id) : null);
      setStatus('started');
      toast.success('Hunt dispatched');
    } catch {
      setStatus('error');
      toast.error('Network error');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="page-header">
        <div>
          <h1>Threat Hunting</h1>
          <div className="subtitle">Dispatch agents to pivot on an indicator and surface related activity.</div>
        </div>
      </header>

      <div className="hunt-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div
          className="mx-auto w-full max-w-xl rounded-lg p-6"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
          }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent-400)' }}
          >
            <ICrosshair size={20} />
          </div>
          <h2 className="text-center text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Start a hunt by entering an IOC below
          </h2>
          <p className="mt-1 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Provide an IP, domain, URL, or file hash. The hunter agent will enrich and pivot.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={ioc}
              onChange={(e) => setIoc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onStart(); }}
              placeholder="e.g. 8.8.8.8, example.com, or a SHA-256"
              aria-label="Indicator of compromise"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
              }}
            />
            <button
              type="button"
              onClick={onStart}
              disabled={status === 'starting'}
              className="btn primary"
              style={{ minWidth: 120 }}
            >
              {status === 'starting' ? 'Starting…' : 'Start hunt'}
            </button>
          </div>

          {status === 'started' && huntId ? (
            <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Hunt <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-400)' }}>{huntId}</span> dispatched. Results will appear in your hunt history.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
