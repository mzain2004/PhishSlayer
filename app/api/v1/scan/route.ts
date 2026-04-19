import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { scanTarget } from "@/lib/scanners/threatScanner";
import { scoreCtiFinding } from "@/lib/ai/analyzer";
import { scanTargetSchema, normalizeTarget } from "@/lib/security/sanitize";
import { runTier0Prevention } from "@/lib/prevention/tier0Engine";
import { apiKeySchema } from "@/lib/security/sanitize";
import { compare as bcryptCompare } from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Public API V1 — Scan Engine ──────────────────────────────────────

const allowedOrigins = (process.env.PUBLIC_API_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type ApiQuotaResult = {
  allowed: boolean;
  api_calls_today: number;
  reset_at: string;
};

async function consumeApiCall(
  client: any,
  userId: string,
  limit: number,
): Promise<ApiQuotaResult> {
  const { data, error } = await (client as any)
    .rpc("consume_api_call", {
      p_user_id: userId,
      p_limit: limit,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to enforce API quota");
  }

  return data as ApiQuotaResult;
}

function corsHeaders(origin?: string | null) {
  const fallbackOrigin = allowedOrigins[0] || "https://phishslayer.tech";
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "x-api-key, Content-Type",
  } as Record<string, string>;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: NextRequest) {
  return handleScan(request);
}

export async function POST(request: NextRequest) {
  return handleScan(request);
}

async function handleScan(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  // ── Auth: API Key Check via DB ─────────────────────────────
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid x-api-key header." },
      { status: 401, headers },
    );
  }

  const apiKeyParsed = apiKeySchema.safeParse(apiKey);
  if (!apiKeyParsed.success) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid API key." },
      { status: 401, headers },
    );
  }

  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const apiKeyLast4 = apiKey.slice(-4);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, subscription_tier, api_calls_today, api_calls_reset_at, api_key",
    )
    .eq("api_key_last4", apiKeyLast4)
    .limit(20);

  if (profileError || !profile || profile.length === 0) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid API key." },
      { status: 401, headers },
    );
  }

  let matchedProfile:
    | {
        id: string;
        subscription_tier: string | null;
        api_calls_today: number | null;
        api_calls_reset_at: string | null;
        api_key: string | null;
      }
    | undefined;

  for (const row of profile) {
    if (row.api_key && (await bcryptCompare(apiKey, row.api_key))) {
      matchedProfile = row;
      break;
    }
  }

  if (!matchedProfile) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid API key." },
      { status: 401, headers },
    );
  }

  const tier = matchedProfile.subscription_tier || "recon";
  if (tier === "recon") {
    return NextResponse.json(
      { error: "Public API requires SOC Pro or higher" },
      { status: 403, headers },
    );
  }

  const limit = tier === "command_control" ? -1 : 1000;

  // ── Extract target ────────────────────────────────────────────────
  let rawTarget: string | null = null;

  if (request.method === "GET") {
    rawTarget = request.nextUrl.searchParams.get("target");
  } else {
    try {
      const body = await request.json();
      rawTarget = body.target || null;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Expected: { "target": "example.com" }' },
        { status: 400, headers },
      );
    }
  }

  if (!rawTarget) {
    return NextResponse.json(
      { error: "Missing required parameter: target" },
      { status: 400, headers },
    );
  }

  // ── Sanitize & validate target ────────────────────────────────────
  const parseResult = scanTargetSchema.safeParse(rawTarget);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid scan target: " + parseResult.error.issues[0].message },
      { status: 400, headers },
    );
  }
  const validTarget = normalizeTarget(rawTarget);

  try {
    const date = new Date().toISOString();

    let quota: ApiQuotaResult | null = null;
    if (limit >= 0) {
      quota = await consumeApiCall(supabaseAdmin, matchedProfile.id, limit);
      if (!quota.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Daily API limit reached." },
          { status: 429, headers },
        );
      }
    }

    headers["X-RateLimit-Limit"] = limit < 0 ? "Unlimited" : String(limit);
    headers["X-RateLimit-Remaining"] =
      limit < 0 || !quota
        ? "Unlimited"
        : String(Math.max(0, limit - quota.api_calls_today));

    // ── Gate 1: Whitelist Check ──────────────────────────────────
    const { data: whitelistHit } = await supabaseAdmin
      .from("whitelist")
      .select("id, target")
      .or(`target.eq.${validTarget},target.eq.www.${validTarget}`)
      .maybeSingle();

    if (whitelistHit) {
      const result = {
        target: validTarget,
        verdict: "clean",
        risk_score: 0,
        threat_category: "Whitelisted",
        ai_summary:
          "Target cleared — matched against the organization whitelist.",
        malicious_count: 0,
        total_engines: 0,
        source: "whitelist",
        scan_date: date,
      };

      await supabaseAdmin.from("scans").insert([
        {
          target: validTarget,
          status: "completed",
          date,
          verdict: "clean",
          malicious_count: 0,
          total_engines: 0,
          ai_summary: result.ai_summary,
          risk_score: 0,
          threat_category: "Whitelisted",
          payload: whitelistHit,
          user_id: matchedProfile.id,
        },
      ]);

      return NextResponse.json({ success: true, data: result }, { headers });
    }

    // ── Gate 2: Proprietary Intel Vault ──────────────────────────
    const { data: intelHit } = await supabaseAdmin
      .from("proprietary_intel")
      .select("*")
      .or(`indicator.eq.${validTarget},indicator.eq.www.${validTarget}`)
      .maybeSingle();

    if (intelHit) {
      const result = {
        target: validTarget,
        verdict: "malicious",
        risk_score: 100,
        threat_category: "Proprietary Local Intel",
        ai_summary: `CRITICAL THREAT — Identified via Proprietary Local Intel. Severity: ${intelHit.severity?.toUpperCase() || "HIGH"}. Source: ${intelHit.source || "Internal Database"}.`,
        malicious_count: 1,
        total_engines: 1,
        source: "proprietary_intel",
        scan_date: date,
      };

      await supabaseAdmin.from("scans").insert([
        {
          target: validTarget,
          status: "completed",
          date,
          verdict: "malicious",
          malicious_count: 1,
          total_engines: 1,
          ai_summary: result.ai_summary,
          risk_score: 100,
          threat_category: "Proprietary Local Intel",
          payload: intelHit,
          user_id: matchedProfile.id,
        },
      ]);

      // Discord webhook (fire-and-forget)
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title: "🚨 API Scan — Malicious Threat Detected",
                color: 16711680,
                fields: [
                  { name: "Target", value: `\`${validTarget}\``, inline: true },
                  {
                    name: "Category",
                    value: "Proprietary Local Intel",
                    inline: true,
                  },
                  { name: "Risk Score", value: "100/100", inline: true },
                  {
                    name: "AI Summary",
                    value: result.ai_summary.slice(0, 1024),
                  },
                ],
                footer: { text: "Phish-Slayer API v1" },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, data: result }, { headers });
    }

    // ── Gate 3: External Scan (VirusTotal → Gemini) ──────────────
    const finding = await scanTarget(validTarget);

    const tier0Input = {
      url: validTarget,
      vt_positives: finding.maliciousCount,
      domain_age_days:
        (finding as any)?.domainAgeDays ??
        (finding as any)?.domain_age_days ??
        null,
      ai_threat_score:
        typeof (finding as any)?.ai_threat_score === "number"
          ? (finding as any).ai_threat_score
          : 0,
      ai_classification:
        ((finding as any)?.ai_classification as string | null | undefined) ||
        null,
    };

    const tier0Result = await runTier0Prevention(tier0Input);

    if (tier0Result.verdict === "BLOCKED") {
      await supabaseAdmin.from("scans").insert([
        {
          target: validTarget,
          status: "tier0_blocked",
          tier0_blocked: true,
          rule_triggered: tier0Result.rule_triggered,
          date,
          verdict: "malicious",
          malicious_count: finding.maliciousCount,
          total_engines: finding.totalEngines,
          ai_summary: tier0Result.reason,
          risk_score: 100,
          threat_category: "Tier0 Prevention",
          payload: finding,
          user_id: matchedProfile.id,
        },
      ]);

      await supabaseAdmin.from("audit_logs").insert({
        action: "TIER0_BLOCK",
        severity: "high",
        organization_id: null,
        metadata: {
          rule_triggered: tier0Result.rule_triggered,
          reason: tier0Result.reason,
          scan_url: validTarget,
        },
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          tier0_blocked: true,
          rule_triggered: tier0Result.rule_triggered,
          reason: tier0Result.reason,
          threat_score: 1.0,
          verdict: "MALICIOUS",
        },
        { headers },
      );
    }

    const aiData = await scoreCtiFinding(finding.summary);

    const result = {
      target: validTarget,
      verdict: finding.verdict,
      risk_score: aiData?.risk_score || 0,
      threat_category: aiData?.threat_category || "Unknown",
      ai_summary: aiData?.ai_summary || "Analysis currently unavailable.",
      malicious_count: finding.maliciousCount,
      total_engines: finding.totalEngines,
      source: "virustotal",
      scan_date: date,
    };

    await supabaseAdmin.from("scans").insert([
      {
        target: validTarget,
        status: "completed",
        date,
        verdict: finding.verdict,
        malicious_count: finding.maliciousCount,
        total_engines: finding.totalEngines,
        ai_summary: result.ai_summary,
        risk_score: result.risk_score,
        threat_category: result.threat_category,
        payload: finding,
        user_id: matchedProfile.id,
      },
    ]);

    // Discord alert for malicious
    if (finding.verdict === "malicious") {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title: "🚨 API Scan — Malicious Threat Detected",
                color: 16711680,
                fields: [
                  { name: "Target", value: `\`${validTarget}\``, inline: true },
                  {
                    name: "Category",
                    value: result.threat_category,
                    inline: true,
                  },
                  {
                    name: "Risk Score",
                    value: `${result.risk_score}/100`,
                    inline: true,
                  },
                  {
                    name: "AI Summary",
                    value: result.ai_summary.slice(0, 1024),
                  },
                ],
                footer: { text: "Phish-Slayer API v1" },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, data: result }, { headers });
  } catch (err: any) {
    if (err?.message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait 60 seconds." },
        { status: 429, headers },
      );
    }

    console.error("API v1 scan error:", err);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500, headers },
    );
  }
}
