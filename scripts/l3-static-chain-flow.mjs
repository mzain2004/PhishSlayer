import crypto from "node:crypto";
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

async function run() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = env.CRON_SECRET;
  const baseUrl = env.INTERNAL_API_URL || "http://localhost:3000";

  assert(supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(serviceKey, "Missing SUPABASE_SERVICE_ROLE_KEY");
  assert(cronSecret, "Missing CRON_SECRET");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testHash = crypto.randomBytes(32).toString("hex");

  const { data: alertRow, error: alertError } = await admin
    .from("alerts")
    .insert({
      source: "wazuh",
      rule_level: 10,
      rule_description: "L3 static analysis chain mock alert",
      file_hash_sha256: testHash,
      status: "pending",
      full_payload: {
        mock: true,
        trigger: "l3-static-chain-flow",
      },
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (alertError) {
    throw new Error(
      `Unable to create mock file-hash alert: ${alertError.message}`,
    );
  }

  assert(alertRow?.id, "Mock alert insert did not return id");

  console.log("STATIC_CHAIN_ALERT_ID", alertRow.id);
  console.log("STATIC_CHAIN_HASH", testHash);

  const response = await fetch(`${baseUrl}/api/cron/l3-hunt`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      `L3 cron returned ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  const cycleId = payload?.cycle_id;
  assert(
    typeof cycleId === "string" && cycleId.length > 0,
    "Missing cycle_id in L3 cron response",
  );

  let stageActions = [];

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const { data: stageRows, error: stageError } = await admin
      .from("audit_logs")
      .select("action, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (stageError) {
      throw new Error(
        `Unable to query static-analysis stage logs: ${stageError.message}`,
      );
    }

    stageActions = (stageRows || [])
      .filter(
        (row) =>
          row.action === "L3_STATIC_ANALYSIS_STAGE" &&
          row.metadata?.cycle_id === cycleId,
      )
      .map((row) => row.metadata?.stage)
      .filter((value) => typeof value === "string");

    if (stageActions.length > 0) {
      break;
    }

    await wait(1500);
  }

  const required = [
    "file_alert_received",
    "static_analysis_triggered",
    "result_stored",
  ];

  const missing = required.filter((item) => !stageActions.includes(item));

  console.log("STATIC_CHAIN_CYCLE_ID", cycleId);
  console.log("STATIC_CHAIN_ACTIONS", stageActions.join(",") || "none");

  if (missing.length > 0) {
    throw new Error(
      `Missing required static-analysis actions: ${missing.join(", ")}`,
    );
  }

  console.log("STATIC_ANALYSIS_LOG_CHAIN_PASS");
}

run().catch((error) => {
  console.error(
    "STATIC_ANALYSIS_LOG_CHAIN_FAIL",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
