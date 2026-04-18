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

  const testStartIso = new Date().toISOString();

  const { data: scanRow, error: scanError } = await admin
    .from("scans")
    .select("id, target")
    .not("target", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scanError) {
    throw new Error(`Unable to fetch scan seed row: ${scanError.message}`);
  }

  assert(
    scanRow && typeof scanRow.target === "string",
    "No scan target available for IOC correlation test",
  );

  const seededIocValue = scanRow.target;

  const { error: upsertError } = await admin.from("threat_intel").upsert(
    {
      ioc_type: "url",
      ioc_value: seededIocValue,
      threat_type: "phishing",
      source: "l3_mock_flow",
      tags: ["mock", "l3"],
      malware: null,
      raw_data: {
        injected_for: "l3-mock-flow-test",
        scan_id: scanRow.id,
      },
      ingested_at: new Date().toISOString(),
      hunted: false,
    },
    { onConflict: "ioc_value" },
  );

  if (upsertError) {
    throw new Error(
      `Unable to upsert threat_intel seed IOC: ${upsertError.message}`,
    );
  }

  console.log("L3_TEST_SEEDED_IOC", seededIocValue);

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

  const reader = payload.reader || {};
  const hunter = payload.hunter || {};
  const reviewer = payload.reviewer || {};

  const urlhausCount = Number(reader?.by_source?.urlhaus || 0);
  const threatFoxCount = Number(reader?.by_source?.threatfox || 0);
  const findings = Number(hunter?.hits_found || 0);
  const reviewerConfidence =
    typeof reviewer?.confidence === "number" ? reviewer.confidence : null;
  const reviewerReasoning =
    typeof reviewer?.reasoning === "string" ? reviewer.reasoning : "";
  const halted = Boolean(payload?.halted);

  assert(urlhausCount > 0, "Reader did not ingest any URLhaus IOCs");
  assert(threatFoxCount > 0, "Reader did not ingest any ThreatFox IOCs");
  assert(findings >= 1, "Hunt did not correlate at least one finding");
  assert(
    !halted,
    "Review/circuit-breaker halted unexpectedly during mock flow",
  );
  assert(reviewerReasoning.length > 0, "Review reasoning summary is missing");

  const { data: findingRows, error: findingError } = await admin
    .from("hunt_findings")
    .select("id, confidence, description, created_at")
    .gte("created_at", testStartIso)
    .order("created_at", { ascending: false })
    .limit(20);

  if (findingError) {
    throw new Error(`Unable to query hunt findings: ${findingError.message}`);
  }

  const confidenceValues = (findingRows || [])
    .map((row) => row.confidence)
    .filter((value) => typeof value === "number");

  console.log("L3_READER_URLHAUS", urlhausCount);
  console.log("L3_READER_THREATFOX", threatFoxCount);
  console.log("L3_FINDINGS_CORRELATED", findings);
  console.log(
    "L3_REVIEW_CONFIDENCE",
    reviewerConfidence === null ? "n/a" : reviewerConfidence,
  );
  console.log("L3_REVIEW_REASONING", reviewerReasoning);
  console.log("L3_NEW_FINDING_ROWS", (findingRows || []).length);
  console.log(
    "L3_CONFIDENCE_SCORES",
    confidenceValues.length > 0
      ? confidenceValues.map((value) => value.toFixed(2)).join(",")
      : "n/a",
  );
  console.log("L3_FLOW_TEST_PASS");
}

run().catch((error) => {
  console.error(
    "L3_FLOW_TEST_FAIL",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
