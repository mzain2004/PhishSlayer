import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const fromFile = fs.existsSync(envPath)
    ? parseEnv(fs.readFileSync(envPath, "utf8"))
    : {};

  return {
    ...fromFile,
    ...process.env,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hasAction(rows, action) {
  return rows.some((row) => row.action === action);
}

function findAction(rows, action) {
  return rows.find((row) => row.action === action) || null;
}

async function run() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = env.WAZUH_WEBHOOK_SECRET;
  const baseUrl = env.INTERNAL_API_URL || "http://localhost:3000";

  assert(supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(serviceKey, "Missing SUPABASE_SERVICE_ROLE_KEY");
  assert(webhookSecret, "Missing WAZUH_WEBHOOK_SECRET");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const externalAlertId = `mock-wazuh-${Date.now()}`;
  const payload = {
    id: externalAlertId,
    timestamp: new Date().toISOString(),
    rule: {
      id: "100500",
      level: 10,
      description:
        "Suspicious PowerShell execution with encoded command and remote script",
      groups: ["windows", "powershell", "execution", "suspicious"],
    },
    agent: {
      id: "mock-agent-01",
      name: "mock-workstation",
      ip: "10.20.30.40",
    },
    data: {
      srcip: "10.20.30.40",
      dstip: "198.51.100.10",
      process_name: "powershell.exe",
      process: {
        name: "powershell.exe",
        pid: 4242,
      },
    },
  };

  const chainStartedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/connectors/wazuh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${webhookSecret}`,
    },
    body: JSON.stringify(payload),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  assert(
    response.ok,
    `Webhook call failed (${response.status}): ${JSON.stringify(responseBody)}`,
  );

  const internalAlertId =
    responseBody?.results?.[0]?.internal_alert_id ||
    responseBody?.internal_alert_id ||
    null;

  assert(internalAlertId, "Webhook response missing internal alert id");

  let chainRows = [];
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const { data, error } = await admin
      .from("audit_logs")
      .select("action, metadata, created_at")
      .in("action", [
        "AGENT_CHAIN_STARTED",
        "L1_COMPLETED",
        "L2_TRIGGERED",
        "L2_COMPLETED",
        "L3_TRIGGERED",
        "L3_COMPLETED",
        "AGENT_CHAIN_COMPLETED",
      ])
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      throw new Error(`Failed to read audit logs: ${error.message}`);
    }

    chainRows = (data || []).filter(
      (row) => row?.metadata?.alert_id === internalAlertId,
    );

    if (hasAction(chainRows, "AGENT_CHAIN_COMPLETED")) {
      break;
    }

    await wait(3000);
  }

  assert(
    hasAction(chainRows, "AGENT_CHAIN_STARTED"),
    "Missing AGENT_CHAIN_STARTED",
  );
  assert(hasAction(chainRows, "L1_COMPLETED"), "Missing L1_COMPLETED");
  assert(
    hasAction(chainRows, "AGENT_CHAIN_COMPLETED"),
    "Missing AGENT_CHAIN_COMPLETED within 60s window",
  );

  const l1Completed = findAction(chainRows, "L1_COMPLETED");
  assert(l1Completed, "Missing L1_COMPLETED event payload");

  const l1Decision = l1Completed?.metadata?.decision;
  assert(
    l1Decision === "CLOSE" || l1Decision === "ESCALATE",
    "L1 decision missing or invalid on L1_COMPLETED",
  );

  if (l1Decision === "ESCALATE") {
    assert(hasAction(chainRows, "L2_TRIGGERED"), "Missing L2_TRIGGERED");
    assert(hasAction(chainRows, "L2_COMPLETED"), "Missing L2_COMPLETED");

    const l2Completed = findAction(chainRows, "L2_COMPLETED");
    assert(l2Completed, "Missing L2_COMPLETED event payload");

    const l2Action = l2Completed?.metadata?.action;
    assert(
      l2Action === "HUNT" ||
        l2Action === "BLOCK_IP" ||
        l2Action === "ISOLATE_IDENTITY" ||
        l2Action === "MANUAL_REVIEW",
      "L2 action missing or invalid on L2_COMPLETED",
    );

    if (
      l2Action === "HUNT" ||
      l2Action === "BLOCK_IP" ||
      l2Action === "ISOLATE_IDENTITY"
    ) {
      assert(hasAction(chainRows, "L3_TRIGGERED"), "Missing L3_TRIGGERED");
      assert(hasAction(chainRows, "L3_COMPLETED"), "Missing L3_COMPLETED");
    } else {
      assert(
        !hasAction(chainRows, "L3_TRIGGERED"),
        "L3_TRIGGERED should not exist when L2 action is MANUAL_REVIEW",
      );
      console.log("L3 correctly skipped - L2 was MANUAL_REVIEW");
    }
  }

  const chainCompleted = findAction(chainRows, "AGENT_CHAIN_COMPLETED");
  const reportedDuration = Number(
    chainCompleted?.metadata?.total_duration_ms || 0,
  );
  const observedDuration = Date.now() - chainStartedAt;
  const totalDurationMs =
    reportedDuration > 0 ? reportedDuration : observedDuration;

  assert(
    totalDurationMs < 60_000,
    `Chain duration exceeded 60s: ${totalDurationMs}ms`,
  );

  console.log("CHAIN_ALERT_ID", internalAlertId);
  console.log("CHAIN_L1_DECISION", l1Decision);
  console.log("CHAIN_TOTAL_DURATION_MS", totalDurationMs);
  console.log("CHAIN_ACTIONS", chainRows.map((row) => row.action).join(","));
  console.log("CHAIN_TEST_PASS");
}

run().catch((error) => {
  console.error(
    "CHAIN_TEST_FAIL",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
