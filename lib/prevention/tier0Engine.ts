import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type Tier0Verdict = "BLOCKED" | "PASSED";

export interface Tier0Result {
  verdict: Tier0Verdict;
  rule_triggered: string | null;
  reason: string | null;
  blocked_at: string | null;
}

type ScanPayload = {
  url?: string | null;
  target?: string | null;
  vt_positives?: number | null;
  domain_age_days?: number | null;
  ai_threat_score?: number | null;
  ai_classification?: string | null;
};

const SUSPICIOUS_TLDS = new Set([
  ".xyz",
  ".tk",
  ".ml",
  ".ga",
  ".cf",
  ".gq",
  ".top",
  ".click",
  ".loan",
  ".work",
  ".date",
  ".racing",
]);

function blocked(rule_triggered: string, reason: string): Tier0Result {
  return {
    verdict: "BLOCKED",
    rule_triggered,
    reason,
    blocked_at: new Date().toISOString(),
  };
}

function passed(): Tier0Result {
  return {
    verdict: "PASSED",
    rule_triggered: null,
    reason: null,
    blocked_at: null,
  };
}

function normalizeTarget(urlOrTarget: string): string {
  const value = (urlOrTarget || "").trim();
  if (!value) {
    return "";
  }

  try {
    const url =
      value.startsWith("http://") || value.startsWith("https://")
        ? new URL(value)
        : new URL(`https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .toLowerCase();
  }
}

function getTld(hostname: string): string | null {
  const clean = hostname.toLowerCase().trim();
  if (!clean || !clean.includes(".")) {
    return null;
  }

  const parts = clean.split(".").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  return `.${parts[parts.length - 1]}`;
}

export async function runTier0Prevention(
  scanPayload: object,
): Promise<Tier0Result> {
  const payload = scanPayload as ScanPayload;
  const hostname = normalizeTarget(payload.url || payload.target || "");

  // Rule 1 — Known Malicious Domain Blocklist
  if (hostname) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: blacklistHit } = await adminClient
      .from("whitelist")
      .select("id")
      .eq("type", "blacklist")
      .eq("value", hostname)
      .maybeSingle();

    if (blacklistHit) {
      return blocked(
        "DOMAIN_BLACKLIST",
        `Domain ${hostname} matched known malicious blacklist.`,
      );
    }
  }

  // Rule 2 — VirusTotal Hard Threshold
  if ((payload.vt_positives ?? 0) >= 10) {
    return blocked(
      "VT_HARD_THRESHOLD",
      "VirusTotal positives met hard threshold (>= 10).",
    );
  }

  // Rule 3 — Zero-Day Domain (Newly Registered)
  if (
    payload.domain_age_days !== null &&
    payload.domain_age_days !== undefined &&
    payload.domain_age_days < 7
  ) {
    return blocked(
      "NEWLY_REGISTERED_DOMAIN",
      "Domain is newly registered (< 7 days old).",
    );
  }

  // Rule 4 — AI Certainty Block
  const classification = (payload.ai_classification || "").toLowerCase();
  if (
    (payload.ai_threat_score ?? 0) >= 0.95 &&
    (classification === "phishing" || classification === "malware")
  ) {
    return blocked(
      "AI_CERTAINTY_BLOCK",
      "AI model certainty indicates high-confidence phishing/malware.",
    );
  }

  // Rule 5 — Known Phishing TLD
  const tld = hostname ? getTld(hostname) : null;
  if (tld && SUSPICIOUS_TLDS.has(tld) && (payload.vt_positives ?? 0) >= 1) {
    return blocked(
      "SUSPICIOUS_TLD_COMBO",
      `Suspicious TLD ${tld} combined with positive VT detections.`,
    );
  }

  return passed();
}
