# PhishSlayer — Phase 11-20 Master Development Prompt
> Paste into Claude Code desktop app from D:\Phish Slayer
> Run with: claude --dangerously-skip-permissions

---

## Context
- All Phases 1-10 complete. Build passes. Security audit done.
- This prompt covers ALL remaining gaps identified in platform review.
- Same absolute rules apply: never modify server.js/middleware.ts without instruction,
  never overwrite .env, always npm run build, always auth + org-scope + force-dynamic.
- Use Supabase MCP for all DB operations.
- Use Scrapling (NOT Firecrawl) for all web scraping.
- Stop after each phase for review.

---

## PHASE 11 — MULTI-MODEL ROUTER (3 days)

### MR1 — Model routing layer

Create `phishslayer-api/core/harness/model_router.py`:

```python
from enum import Enum
from dataclasses import dataclass
from config.settings import settings

class ModelTier(Enum):
    FAST = "fast"       # L1 triage — high volume, low cost
    BALANCED = "balanced"  # L2 response — medium complexity
    DEEP = "deep"       # L3 hunting — deep reasoning
    EXPERT = "expert"   # RevEng/forensics — hardest tasks
    FALLBACK = "fallback"  # When primary rate-limited

MODEL_CONFIGS = {
    ModelTier.FAST: {
        "provider": "anthropic",
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2048,
        "temperature": 0.1,
        "cost_per_1k_input": 0.001,
        "cost_per_1k_output": 0.005,
    },
    ModelTier.BALANCED: {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6-20250514",
        "max_tokens": 4096,
        "temperature": 0.2,
        "cost_per_1k_input": 0.003,
        "cost_per_1k_output": 0.015,
    },
    ModelTier.DEEP: {
        "provider": "anthropic",
        "model": "claude-opus-4-6-20250514",
        "max_tokens": 8192,
        "temperature": 0.3,
        "cost_per_1k_input": 0.015,
        "cost_per_1k_output": 0.075,
    },
    ModelTier.EXPERT: {
        "provider": "anthropic",
        "model": "claude-opus-4-7-20250514",
        "max_tokens": 16384,
        "temperature": 0.4,
        "cost_per_1k_input": 0.015,
        "cost_per_1k_output": 0.075,
    },
    ModelTier.FALLBACK: {
        "provider": "groq",
        "model": "llama3-70b-8192",
        "max_tokens": 4096,
        "temperature": 0.2,
        "cost_per_1k_input": 0.0,
        "cost_per_1k_output": 0.0,
    },
}

AGENT_TO_TIER = {
    "l1_triage": ModelTier.FAST,
    "l2_responder": ModelTier.BALANCED,
    "l3_hunter": ModelTier.DEEP,
    "l3_reporter": ModelTier.DEEP,
    "reveng_engine": ModelTier.EXPERT,
    "forensics": ModelTier.EXPERT,
    "rule_forge": ModelTier.BALANCED,
    "consequence_predictor": ModelTier.FAST,
    "osint_analyzer": ModelTier.BALANCED,
}

class ModelRouter:
    def __init__(self):
        self._call_counts = {}
        self._error_counts = {}

    def get_model(self, agent_name: str) -> dict:
        tier = AGENT_TO_TIER.get(agent_name, ModelTier.BALANCED)
        config = MODEL_CONFIGS[tier].copy()
        # Check if primary provider is rate-limited (>5 errors in 60s)
        error_key = f"{config['provider']}:{config['model']}"
        if self._error_counts.get(error_key, 0) > 5:
            config = MODEL_CONFIGS[ModelTier.FALLBACK].copy()
        return config

    def record_error(self, provider: str, model: str):
        key = f"{provider}:{model}"
        self._error_counts[key] = self._error_counts.get(key, 0) + 1

    def record_success(self, provider: str, model: str):
        key = f"{provider}:{model}"
        self._error_counts[key] = max(0, self._error_counts.get(key, 0) - 1)

    def estimate_cost(self, agent_name: str, input_tokens: int, output_tokens: int) -> float:
        config = self.get_model(agent_name)
        return (input_tokens / 1000 * config["cost_per_1k_input"] +
                output_tokens / 1000 * config["cost_per_1k_output"])
```

Create `phishslayer-api/core/harness/anthropic_client.py`:
- Wrapper around `anthropic` Python SDK
- Uses model_router to select model per agent
- Falls back to Groq on rate limit (429)
- Records success/error counts
- Logs every call to AgentOps

### MR2 — Wire into existing agents

Update ALL agent files to use ModelRouter instead of hardcoded Groq:
- `agents/l1_triage/agent.py` → ModelTier.FAST
- `agents/l2_responder/response_executor.py` → ModelTier.BALANCED
- `agents/l3_hunter/deerflow/coordinator.py` → ModelTier.DEEP
- `agents/l3_hunter/deerflow/reporter.py` → ModelTier.DEEP
- `core/harness/consequence_predictor.py` → ModelTier.FAST

Add to requirements.txt: `anthropic>=0.34.0`

Append to .env.production: `ANTHROPIC_API_KEY=REPLACE_WITH_ACTUAL_KEY`

---

## PHASE 12 — SUPERVISOR ORCHESTRATOR AGENT

### SO1 — Parent agent that supervises L1/L2/L3

Create `phishslayer-api/agents/orchestrator/supervisor.py`:

```python
"""
Supervisor agent sits above L1/L2/L3.
Responsibilities:
1. Route incoming alerts to correct agent level
2. Monitor agent health (detect stuck/runaway agents)
3. Kill agents exceeding timeout (L1: 30s, L2: 60s, L3: 300s)
4. Escalate automatically if agent fails
5. Track per-org agent workload for load balancing
6. Decide if alert needs L1-only or skip-to-L2/L3
"""
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta

TIMEOUTS = {"l1": 30, "l2": 60, "l3": 300}

@dataclass
class AgentTask:
    alert_id: str
    org_id: str
    level: str
    started_at: datetime
    task: asyncio.Task

class SupervisorAgent:
    def __init__(self):
        self.active_tasks: dict[str, AgentTask] = {}
        self.health_check_interval = 10  # seconds

    async def dispatch(self, alert_id, org_id, raw_alert):
        # 1. Pre-classify: severity + attack_type → decide starting level
        level = self._classify_entry_level(raw_alert)
        # 2. Check org workload — if too many L3s running, queue instead
        org_l3_count = sum(1 for t in self.active_tasks.values()
                          if t.org_id == org_id and t.level == "l3")
        if level == "l3" and org_l3_count >= 3:
            level = "l2"  # downgrade to L2 until L3 slot frees

        # 3. Dispatch agent task
        task = asyncio.create_task(self._run_agent(alert_id, org_id, level))
        self.active_tasks[alert_id] = AgentTask(
            alert_id=alert_id, org_id=org_id, level=level,
            started_at=datetime.utcnow(), task=task
        )
        return {"alert_id": alert_id, "dispatched_level": level}

    async def _run_agent(self, alert_id, org_id, level):
        timeout = TIMEOUTS[level]
        try:
            result = await asyncio.wait_for(
                self._execute_agent(alert_id, org_id, level),
                timeout=timeout
            )
            return result
        except asyncio.TimeoutError:
            # Agent exceeded timeout — kill and escalate
            logger.error(f"agent_timeout", alert_id=alert_id, level=level)
            if level == "l1":
                return await self._execute_agent(alert_id, org_id, "l2")
            elif level == "l2":
                return await self._execute_agent(alert_id, org_id, "l3")
            else:
                # L3 timed out — flag for human
                return {"status": "timeout", "requires_human": True}
        finally:
            self.active_tasks.pop(alert_id, None)

    def _classify_entry_level(self, raw_alert):
        severity = raw_alert.get("rule", {}).get("level", 0)
        if severity >= 12:
            return "l3"  # Critical → skip to L3
        elif severity >= 8:
            return "l2"  # High → L2
        else:
            return "l1"  # Default → L1

    async def health_check(self):
        """Run periodically to kill stuck agents."""
        while True:
            now = datetime.utcnow()
            for alert_id, task in list(self.active_tasks.items()):
                elapsed = (now - task.started_at).seconds
                timeout = TIMEOUTS[task.level]
                if elapsed > timeout * 2:  # 2x timeout = definitely stuck
                    task.task.cancel()
                    self.active_tasks.pop(alert_id, None)
                    logger.error("agent_killed_stuck", alert_id=alert_id)
            await asyncio.sleep(self.health_check_interval)
```

### SO2 — Wire supervisor into FastAPI

Update `phishslayer-api/api/routes/l1.py` (and l2, l3):
- All incoming alert dispatches go through SupervisorAgent.dispatch()
- Supervisor decides which level to start at
- Supervisor manages timeouts and escalation

### SO3 — Agent-to-Agent Message Bus

Create `phishslayer-api/core/harness/message_bus.py`:

```python
"""
Redis pub/sub message bus for agent-to-agent communication.
L1 publishes enrichment results → L2 subscribes (no re-LLMing).
L2 publishes consequence predictions → L3 subscribes.
Saves tokens by sharing structured data, not re-analyzing.
"""
import json
import redis.asyncio as redis

class AgentMessageBus:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)

    async def publish(self, channel: str, message: dict):
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe(self, channel: str):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(channel)
        return pubsub

    # Channel conventions:
    # agent:handoff:{alert_id} — L1→L2 or L2→L3 handoff data
    # agent:status:{alert_id} — agent lifecycle events
    # agent:health:{org_id}   — supervisor health broadcasts
```

---

## PHASE 13 — ALERT INGESTION QUEUE (DLQ + batch)

### AQ1 — BullMQ job queue on Redis

Install: `npm install bullmq`

Create `lib/queue/alert-queue.ts`:

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!)

export const alertQueue = new Queue('alert-ingestion', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 },  // keep 24h
    removeOnFail: { age: 604800 },     // keep 7 days in DLQ
  }
})

// Dead Letter Queue — failed alerts after 3 retries
export const dlqQueue = new Queue('alert-dlq', { connection })

export const alertWorker = new Worker('alert-ingestion', async (job) => {
  const { alertData, orgId, source } = job.data
  // Process alert through L1 pipeline
  const response = await fetch(`${process.env.PYTHON_API_URL}/agents/l1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert: alertData, org_id: orgId })
  })
  if (!response.ok) throw new Error(`Agent service returned ${response.status}`)
  return response.json()
}, {
  connection,
  concurrency: 5,  // process 5 alerts simultaneously
  limiter: { max: 50, duration: 60000 }  // max 50/min per queue
})

alertWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 3) {
    // Move to DLQ after 3 failures
    await dlqQueue.add('failed-alert', {
      ...job.data,
      error: err.message,
      failedAt: new Date().toISOString()
    })
  }
})
```

### AQ2 — Update webhook routes to use queue

Update `app/api/webhooks/wazuh/route.ts`:
- Instead of processing alert synchronously, add to alertQueue
- Return 202 Accepted immediately
- Alert processed asynchronously by worker

### AQ3 — Circuit breaker for agent service

Create `lib/circuit-breaker.ts`:

```typescript
export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000  // 30s
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('CIRCUIT_OPEN')
      }
    }
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
}
```

Wire circuit breaker around all agent service fetch calls.

---

## PHASE 14 — SECURITY HARDENING

### SH1 — CSP headers

Update `next.config.js` (NOT next.config.ts) — add Content Security Policy:

```javascript
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.clerk.com; frame-src https://clerk.com;" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]
```

### SH2 — CORS tightening

Update `next.config.js` — restrict CORS to only phishslayer.tech:

### SH3 — Dependency audit in CI

Update `.github/workflows/deploy.yml` — add npm audit step:
```yaml
- name: Security audit
  run: npm audit --audit-level=high || true
```

### SH4 — Critical asset whitelist

Create `lib/security/asset-whitelist.ts`:
```typescript
// Production servers that NEVER get auto-blocked without human approval
// Stored in Supabase per-org, loaded at L2 execution time
export async function isWhitelistedAsset(orgId: string, assetIdentifier: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('critical_assets')
    .select('id')
    .eq('organization_id', orgId)
    .eq('identifier', assetIdentifier)
    .maybeSingle()
  return !!data
}
```

Via Supabase MCP create:
```sql
CREATE TABLE IF NOT EXISTS critical_assets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    identifier      text NOT NULL,
    asset_type      text CHECK (asset_type IN ('ip','hostname','server','service','user')),
    reason          text,
    created_by      text NOT NULL,
    created_at      timestamptz DEFAULT now()
);
ALTER TABLE critical_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "critical_assets_org" ON critical_assets FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
```

### SH5 — Maintenance windows

Create `lib/security/maintenance-windows.ts`:
```typescript
// Never auto-block during business hours unless severity = CRITICAL
export async function isMaintenanceWindow(orgId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('maintenance_windows')
    .select('*')
    .eq('organization_id', orgId)
    .gte('end_time', new Date().toISOString())
    .lte('start_time', new Date().toISOString())
    .maybeSingle()
  return !!data
}
```

Wire into L2 response_executor: if maintenance window active AND severity != CRITICAL → queue for human.

---

## PHASE 15 — MISP CTI INTEGRATION

### MISP1 — MISP connector

Create `phishslayer-api/tools/cti/misp_tool.py`:

```python
"""
MISP (Malware Information Sharing Platform) integration.
Enriches IOCs with community threat intelligence.
Uses PyMISP SDK from github.com/MISP/PyMISP
"""
from pymisp import PyMISP

class MISPConnector:
    def __init__(self, url: str, key: str, ssl: bool = True):
        self.misp = PyMISP(url, key, ssl)

    def search_ioc(self, ioc_value: str, ioc_type: str = "ip-src"):
        """Search MISP for matching IOCs."""
        result = self.misp.search(
            controller="attributes",
            value=ioc_value,
            type_attribute=ioc_type,
            limit=10,
            pythonify=True
        )
        return [{
            "event_id": attr.event_id,
            "category": attr.category,
            "type": attr.type,
            "value": attr.value,
            "comment": attr.comment,
            "threat_level": getattr(attr, 'threat_level_id', None),
            "tags": [t.name for t in getattr(attr, 'Tag', [])]
        } for attr in result]

    def get_event(self, event_id: int):
        """Get full MISP event with all attributes."""
        event = self.misp.get_event(event_id, pythonify=True)
        return {
            "id": event.id,
            "info": event.info,
            "threat_level": event.threat_level_id,
            "analysis": event.analysis,
            "date": str(event.date),
            "attribute_count": len(event.attributes),
            "tags": [t.name for t in event.tags] if event.tags else []
        }

    def submit_ioc(self, event_id: int, ioc_type: str, ioc_value: str, comment: str = ""):
        """Submit new IOC back to MISP community."""
        self.misp.add_attribute(event_id, {
            "type": ioc_type,
            "value": ioc_value,
            "comment": f"[PhishSlayer] {comment}",
            "to_ids": True
        })
```

Add to requirements.txt: `pymisp>=2.4.180`

Wire MISP search into L1 enrich_osint node (parallel with VT/AbuseIPDB).

### MISP2 — Settings UI for MISP connection

Create `app/api/settings/integrations/misp/route.ts`:
- POST: save MISP URL + API key to Supabase `integrations` table (org-scoped)
- GET: return connection status

Add MISP card to Settings → Integrations page.

---

## PHASE 16 — WAZUH RULE FORGE (auto rule generation)

### RF1 — Rule generator agent

Create `phishslayer-api/agents/rule_forge/generator.py`:

```python
"""
Rule Forge: auto-generates detection rules from L3 hunt findings.
Generates: Sigma rules + YARA rules + Wazuh XML decoders.
Uses ModelTier.BALANCED (Sonnet) for rule generation.
All rules stored with applied=false — human review required.
"""

class RuleForgeAgent:
    async def generate_sigma_rule(self, hunt_report: dict) -> str:
        """Generate Sigma rule from hunt findings."""
        prompt = f"""
        Based on this threat hunt report, generate a Sigma detection rule.
        Follow Sigma specification v2.0 exactly.
        
        Hunt findings:
        - Attack type: {hunt_report['attack_type']}
        - IOCs: {hunt_report['iocs']}
        - MITRE techniques: {hunt_report['mitre_techniques']}
        - Behavioral indicators: {hunt_report['indicators']}
        
        Output ONLY the YAML Sigma rule, nothing else.
        """
        # Use ModelRouter for correct model
        result = await model_router.complete("rule_forge", prompt)
        return result

    async def generate_yara_rule(self, hunt_report: dict) -> str:
        """Generate YARA rule for file-based detection."""
        # Similar prompt pattern, YARA syntax

    async def generate_wazuh_rule(self, hunt_report: dict) -> str:
        """Generate Wazuh XML rule/decoder."""
        # Wazuh-specific XML format

    async def push_to_wazuh(self, org_id: str, rule_xml: str):
        """Push generated rule to Wazuh manager via API."""
        # Uses wazuh_tool.py to POST rule
        # Only if org has Wazuh integration configured
```

Via Supabase MCP create:
```sql
CREATE TABLE IF NOT EXISTS generated_rules (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id),
    hunt_report_id  uuid REFERENCES hunt_reports(id),
    rule_type       text CHECK (rule_type IN ('sigma','yara','wazuh','suricata')),
    rule_content    text NOT NULL,
    status          text DEFAULT 'pending' CHECK (status IN ('pending','approved','deployed','rejected')),
    deployed_at     timestamptz,
    effectiveness   jsonb,
    created_at      timestamptz DEFAULT now()
);
ALTER TABLE generated_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_org" ON generated_rules FOR ALL
USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
```

---

## PHASE 17 — FORENSICS + QUARANTINE

### FQ1 — Quarantine via Wazuh active response

Create `phishslayer-api/agents/forensics/quarantine_manager.py`:

```python
"""
Machine quarantine via Wazuh active response.
Isolates infected endpoints from network.
NEVER quarantines whitelisted critical assets.
"""

class QuarantineManager:
    async def isolate_machine(self, org_id: str, agent_id: str, alert_id: str):
        # 1. Check critical_assets whitelist
        if await self.is_whitelisted(org_id, agent_id):
            return {"status": "blocked", "reason": "CRITICAL_ASSET_WHITELISTED"}
        
        # 2. Check maintenance window
        if await self.is_maintenance_window(org_id):
            return {"status": "queued", "reason": "MAINTENANCE_WINDOW"}
        
        # 3. Log quarantine action with full reasoning
        await self.log_action(org_id, agent_id, alert_id, "isolate")
        
        # 4. Execute via Wazuh active response
        result = await wazuh_tool.active_response(
            agent_id=agent_id,
            command="firewall-drop",
            alert_id=alert_id
        )
        return result

    async def release_machine(self, org_id: str, agent_id: str, approved_by: str):
        # Requires explicit human approval to release
        await self.log_action(org_id, agent_id, None, "release", approved_by)
        return await wazuh_tool.active_response(
            agent_id=agent_id,
            command="firewall-undrop"
        )
```

### FQ2 — Evidence chain of custody

Via Supabase MCP create:
```sql
CREATE TABLE IF NOT EXISTS forensic_evidence (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    alert_id        uuid REFERENCES alerts(id),
    evidence_type   text CHECK (evidence_type IN (
        'memory_snapshot','disk_image','network_capture',
        'log_extract','malware_sample','screenshot'
    )),
    hash_sha256     text NOT NULL,
    storage_path    text,
    collected_by    text NOT NULL,
    collected_at    timestamptz DEFAULT now(),
    chain_of_custody jsonb DEFAULT '[]',
    notes           text
);
ALTER TABLE forensic_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_org" ON forensic_evidence FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
```

---

## PHASE 18 — PROFESSIONAL SOC REPORTS

### PR1 — Report generator

Create `phishslayer-api/agents/reporting/soc_report_generator.py`:

```python
"""
Generates professional SOC reports at 3 levels:
1. Executive Summary (CISO-readable, 1 page)
2. Technical Deep Dive (analyst-readable, full detail)
3. Compliance Report (SOC 2/ISO 27001/NIST mapping)
"""

class SOCReportGenerator:
    async def generate_executive_report(self, org_id, period_days=30):
        metrics = await self.fetch_metrics(org_id, period_days)
        prompt = f"""
        Generate a 1-page executive security summary for a CISO.
        Period: last {period_days} days
        Metrics: {json.dumps(metrics)}
        Include: key threats, MTTR trend, agent performance, recommendations.
        Tone: professional, concise, action-oriented.
        """
        return await model_router.complete("rule_forge", prompt)

    async def generate_technical_report(self, org_id, alert_id):
        # Full incident timeline, IOCs, MITRE mapping, agent reasoning
        pass

    async def generate_compliance_report(self, org_id, framework="nist"):
        # Map activities to NIST 800-53 / ISO 27001 / SOC 2 controls
        pass
```

### PR2 — PDF export API

Create `app/api/reports/export/route.ts`:
- POST: `{orgId, reportType, alertId?, period?}`
- Generates PDF using @react-pdf/renderer or puppeteer
- Returns download URL
- Auth-gated + org-scoped

---

## PHASE 19 — OSINT ENHANCEMENT

### OS1 — Deep OSINT pipeline

Create `phishslayer-api/tools/osint/deep_osint.py`:

```python
"""
Deep OSINT — human-level intelligence gathering.
Combines multiple sources into unified entity profile.
"""

class DeepOSINT:
    async def investigate_ip(self, ip: str) -> dict:
        results = await asyncio.gather(
            self.virustotal_lookup(ip),
            self.abuseipdb_lookup(ip),
            self.shodan_lookup(ip),       # Shodan API
            self.greynoise_lookup(ip),    # GreyNoise community
            self.whois_lookup(ip),
            self.scrapling_passive_dns(ip),
            return_exceptions=True
        )
        return self.merge_results(results)

    async def investigate_domain(self, domain: str) -> dict:
        results = await asyncio.gather(
            self.virustotal_domain(domain),
            self.urlscan_search(domain),
            self.scrapling_crawl(domain),
            self.whois_history(domain),
            self.certificate_transparency(domain),  # crt.sh
            self.haveibeenpwned_domain(domain),
            return_exceptions=True
        )
        return self.merge_results(results)

    async def investigate_email(self, email: str) -> dict:
        results = await asyncio.gather(
            self.haveibeenpwned_email(email),
            self.hunter_io_verify(email),
            self.scrapling_social_search(email),
            return_exceptions=True
        )
        return self.merge_results(results)
```

Add free APIs: Shodan (community), GreyNoise (community), crt.sh (free), HIBP (rate-limited free).

---

## PHASE 20 — MCP SERVER CONVERSION

### MCP1 — OSINT MCP Server

Create `mcp-servers/osint/server.py`:

```python
"""
PhishSlayer OSINT MCP Server
Exposes: vt_check_ip, abuseipdb_check, urlscan_submit,
         scrapling_fetch, shodan_lookup, whois_lookup,
         misp_search, deep_osint_investigate
As MCP tools accessible by any Claude agent.
"""
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("phishslayer-osint")

@mcp.tool()
def vt_check_ip(ip: str) -> dict:
    """Check IP against VirusTotal threat intelligence."""
    # Wraps existing virustotal_tool.py
    pass

@mcp.tool()
def scrapling_fetch(url: str, stealth: bool = False) -> dict:
    """Fetch and extract text from URL using Scrapling."""
    # Wraps existing scrapling_tool.py
    pass

# ... register all OSINT tools
```

### MCP2 — Wazuh MCP Server

Create `mcp-servers/wazuh/server.py`:
- wazuh_get_alert, wazuh_active_response, wazuh_get_agent

### MCP3 — Graph MCP Server

Create `mcp-servers/graph/server.py`:
- graph_get_signin_logs, graph_revoke_session, graph_device_compliance

### MCP4 — Docker integration

Add to docker-compose.yml:
```yaml
mcp-osint:
  build: ./mcp-servers/osint
  ports: ["9001:9001"]
mcp-wazuh:
  build: ./mcp-servers/wazuh
  ports: ["9002:9002"]
mcp-graph:
  build: ./mcp-servers/graph
  ports: ["9003:9003"]
```

Add to requirements.txt: `mcp>=1.0.0`

---

## VALIDATION AFTER EACH PHASE

```bash
npm run build
cd phishslayer-api && python -m py_compile **/*.py
grep -rn "error\.message" app/api/ | grep -v "console\.\|\/\/"
grep -rn "export async function" app/api/ -l | xargs grep -L "auth()" | grep -v "webhooks\|cron"
```

All must return zero. Fix before next phase.

---

## BUILD ORDER

```
Phase 11: Multi-model router (Haiku→Sonnet→Opus) — 3 days
Phase 12: Supervisor orchestrator + message bus — 3 days
Phase 13: Alert queue (BullMQ + DLQ + circuit breaker) — 2 days
Phase 14: Security hardening (CSP + CORS + audit + whitelist) — 1 day
Phase 15: MISP CTI integration — 2 days
Phase 16: Wazuh Rule Forge — 2 days
Phase 17: Forensics + quarantine — 2 days
Phase 18: Professional SOC reports — 2 days
Phase 19: OSINT enhancement — 3 days
Phase 20: MCP server conversion — 3 days

Stop after each phase for review.
```
