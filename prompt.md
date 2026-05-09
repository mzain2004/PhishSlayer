Read the ruflo repository at https://github.com/ruvnet/ruflo/tree/main and do the following:

1. Use the Bash tool to clone it locally:
   git clone https://github.com/ruvnet/ruflo.git /tmp/ruflo

2. Read the full structure:
   find /tmp/ruflo -type f -name "_.py" -o -name "_.ts" -o -name "\*.md" | head -60

3. Read these specific paths:
   - /tmp/ruflo/README.md
   - Any files in /tmp/ruflo/workflows/
   - Any files in /tmp/ruflo/agents/
   - Any files in /tmp/ruflo/swarm/
   - Any CLAUDE.md files

4. Identify ONLY the workflows and patterns that are directly relevant to PhishSlayer:
   - Multi-agent swarm coordination (maps to L3 Hunter Reader→Hunter→Reviewer)
   - Autonomous workflow loops (maps to L1→L2→L3 chain)
   - RAG integration patterns (maps to Page Index RAG)
   - Claude Code native hooks (maps to CI/CD review)

5. For each relevant workflow found:
   - Explain what it does in 2 sentences
   - Show exactly where it fits in PhishSlayer's architecture
   - Show the specific file in phishslayer-api/ where it should be integrated
   - Show the integration code (NOT a full rewrite — adapter pattern only)

6. Do NOT copy the full ruflo codebase. Extract ONLY the workflow patterns
   and adapt them to work with PhishSlayer's existing:
   - AgentScope v1.x agents
   - LangGraph state machines
   - DeerFlow 2.0 pipeline
   - phishslayer-api/ structure

7. After integrating each pattern:
   - Run npm run build (Next.js must still pass)
   - Run python -m py_compile on each new .py file

8. Output a summary:
   Workflow | Source file in ruflo | Integrated into | Lines added

Audit the entire PhishSlayer codebase for logging coverage, then implement
structured logging everywhere it's missing.

## STEP 1 — AUDIT FIRST

Run these scans:

```bash
# What logging exists currently
grep -rn "console\.log\|console\.error\|console\.warn\|logger\." app/ --include="*.ts" | wc -l
grep -rn "import.*logger\|from.*logger" app/ --include="*.ts" | head -20
grep -rn "console\.log\|console\.error" phishslayer-api/ --include="*.py" | wc -l
grep -rn "import logging\|from.*logging" phishslayer-api/ --include="*.py" | head -20
```

Report: how many files have zero logging, which critical paths have no logs.

## STEP 2 — CREATE STRUCTURED LOGGER (Next.js)

Create `lib/logger.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string; // ISO 8601
  level: LogLevel;
  request_id: string; // from header or generated
  user_id: string | null; // Clerk userId
  org_id: string | null; // Clerk orgId
  route: string; // API route path
  event: string; // what happened
  duration_ms?: number; // for timing logs
  alert_id?: string; // for agent operations
  agent_level?: string; // l1 | l2 | l3
  error_code?: string; // sanitized error code
  metadata?: Record<string, unknown>; // extra context
}

function buildEntry(
  level: LogLevel,
  event: string,
  context: Partial<LogEntry>,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    request_id: context.request_id ?? crypto.randomUUID(),
    user_id: context.user_id ?? null,
    org_id: context.org_id ?? null,
    route: context.route ?? "unknown",
    event,
    ...context,
  };
}

export const logger = {
  info: (event: string, ctx?: Partial<LogEntry>) =>
    console.log(JSON.stringify(buildEntry("info", event, ctx ?? {}))),
  warn: (event: string, ctx?: Partial<LogEntry>) =>
    console.warn(JSON.stringify(buildEntry("warn", event, ctx ?? {}))),
  error: (event: string, ctx?: Partial<LogEntry>) =>
    console.error(JSON.stringify(buildEntry("error", event, ctx ?? {}))),
  debug: (event: string, ctx?: Partial<LogEntry>) =>
    process.env.NODE_ENV !== "production" &&
    console.debug(JSON.stringify(buildEntry("debug", event, ctx ?? {}))),
};
```

## STEP 3 — REQUEST CONTEXT MIDDLEWARE

Update `middleware.ts` (ONLY add request_id injection — nothing else):

- Generate `x-request-id` header if not present: `crypto.randomUUID()`
- Pass it through to all API routes via response headers

## STEP 4 — API ROUTE LOGGING HELPER

Create `lib/api-logger.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { logger } from "./logger";

export async function withLogging(
  request: Request,
  route: string,
  handler: (ctx: {
    userId: string;
    orgId: string;
    requestId: string;
  }) => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { userId, orgId } = await auth();
  const start = Date.now();

  logger.info("request_start", {
    route,
    request_id: requestId,
    user_id: userId,
    org_id: orgId,
  });

  try {
    const response = await handler({
      userId: userId!,
      orgId: orgId!,
      requestId,
    });
    logger.info("request_complete", {
      route,
      request_id: requestId,
      user_id: userId,
      org_id: orgId,
      duration_ms: Date.now() - start,
    });
    return response;
  } catch (error) {
    logger.error("request_failed", {
      route,
      request_id: requestId,
      user_id: userId,
      org_id: orgId,
      duration_ms: Date.now() - start,
      error_code: "UNHANDLED_EXCEPTION",
    });
    throw error;
  }
}
```

## STEP 5 — ADD LOGGING TO ALL CRITICAL API ROUTES

For every file in these paths, add structured logging:

- app/api/agents/l1/route.ts
- app/api/agents/l2/route.ts
- app/api/agents/l3/route.ts
- app/api/webhooks/wazuh/route.ts
- app/api/webhooks/polar/route.ts
- app/api/ingest/webhook/route.ts
- app/api/cron/l1-triage/route.ts
- app/api/cron/l2-respond/route.ts
- app/api/cron/l3-hunt/route.ts
- app/api/billing/webhook/route.ts

Log these events at minimum per route:

- request_start (with userId, orgId, requestId)
- auth_failed (if 401 returned)
- validation_failed (if Zod throws)
- agent_dispatched (with alert_id)
- webhook_received (with source)
- webhook_signature_invalid
- request_complete (with duration_ms)
- request_failed (with error_code)

## STEP 6 — PYTHON STRUCTURED LOGGER

Create `phishslayer-api/observability/logger.py`:

```python
import logging
import json
import time
from datetime import datetime, timezone
from typing import Optional
import uuid

class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "event": record.getMessage(),
            "request_id": getattr(record, "request_id", None),
            "user_id": getattr(record, "user_id", None),
            "org_id": getattr(record, "org_id", None),
            "alert_id": getattr(record, "alert_id", None),
            "agent_level": getattr(record, "agent_level", None),
            "duration_ms": getattr(record, "duration_ms", None),
            "error_code": getattr(record, "error_code", None),
            "module": record.module,
            "metadata": getattr(record, "metadata", None)
        }
        # Remove None values for clean logs
        entry = {k: v for k, v in entry.items() if v is not None}
        return json.dumps(entry)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    return logger

class AgentLogger:
    """Context-aware logger for agent operations."""
    def __init__(self, agent_level: str, alert_id: str, org_id: str, request_id: str):
        self._logger = get_logger(f"phishslayer.agents.{agent_level}")
        self._ctx = {
            "agent_level": agent_level,
            "alert_id": alert_id,
            "org_id": org_id,
            "request_id": request_id
        }

    def info(self, event: str, **kwargs):
        self._logger.info(event, extra={**self._ctx, "metadata": kwargs or None})

    def warn(self, event: str, **kwargs):
        self._logger.warning(event, extra={**self._ctx, "metadata": kwargs or None})

    def error(self, event: str, error_code: str = "UNKNOWN", **kwargs):
        self._logger.error(event, extra={**self._ctx, "error_code": error_code, "metadata": kwargs or None})

    def tool_call(self, tool_name: str, duration_ms: int, success: bool, **kwargs):
        self._logger.info(
            f"tool_call:{tool_name}",
            extra={**self._ctx, "duration_ms": duration_ms,
                   "metadata": {"tool": tool_name, "success": success, **kwargs}}
        )
```

## STEP 7 — ADD LOGGING TO AGENT SERVICE

Inject `AgentLogger` into:

- `core/harness/agent_executor.py` — log session start/end, token usage
- `core/harness/consequence_predictor.py` — log prediction + confidence
- `core/harness/memory_manager.py` — log cache hits/misses
- `agents/l1_triage/agent.py` — log every node completion
- Each OSINT tool (scrapling, virustotal, abuseipdb, urlscan) — log call + duration

## STEP 8 — FASTAPI REQUEST LOGGING MIDDLEWARE

Add to `phishslayer-api/main.py`:

```python
from starlette.middleware.base import BaseHTTPMiddleware
import time, uuid

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        start = time.time()

        api_logger.info("request_start", extra={
            "request_id": request_id,
            "metadata": {"method": request.method, "path": request.url.path}
        })

        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)

        api_logger.info("request_complete", extra={
            "request_id": request_id,
            "duration_ms": duration_ms,
            "metadata": {"status_code": response.status_code}
        })

        response.headers["x-request-id"] = request_id
        return response

app.add_middleware(StructuredLoggingMiddleware)
```

## STEP 9 — VALIDATION

After implementing:

1. Run: npm run build (must pass)
2. Start dev server, hit /api/agents/l1 with invalid auth
3. Confirm log output is:

```json
{
  "timestamp": "2026-05-07T...",
  "level": "warn",
  "event": "auth_failed",
  "request_id": "uuid",
  "route": "/api/agents/l1"
}
```

4. Confirm NO raw error.message in any log event
5. Confirm ALL log entries are valid JSON (pipe to `jq . ` test)

## STEP 10 — SUPABASE LOG TABLE (optional but recommended)

Via Supabase MCP, create:

```sql
CREATE TABLE IF NOT EXISTS platform_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp   timestamptz NOT NULL DEFAULT now(),
    level       text CHECK (level IN ('debug','info','warn','error')),
    event       text NOT NULL,
    request_id  text,
    user_id     text,
    org_id      uuid,
    alert_id    uuid,
    agent_level text,
    duration_ms int,
    error_code  text,
    metadata    jsonb
);
-- No RLS — admin-only table
-- Partition by month for scale
CREATE INDEX idx_platform_logs_org ON platform_logs(org_id, timestamp DESC);
CREATE INDEX idx_platform_logs_alert ON platform_logs(alert_id);
CREATE INDEX idx_platform_logs_request ON platform_logs(request_id);
CREATE INDEX idx_platform_logs_level ON platform_logs(level, timestamp DESC);
```

Write ERROR + WARN level logs to this table in addition to stdout.
Read-only via `/api/admin/logs` route (admin role only).

Run npm run build after all changes. Output summary of files modified.
