import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { safeCompare } from "@/lib/security/safeCompare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Admin Supabase client (bypasses RLS for agent writes)
const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

const SAFE_PROCESSES = new Set([
  "chrome",
  "firefox",
  "node",
  "nginx",
  "sshd",
  "python",
  "python3",
  "curl",
  "wget",
  "git",
  "npm",
  "next",
  "code",
  "slack",
  "zoom",
  "spotify",
  "docker",
  "kubectl",
  "postgres",
  "redis-server",
  "mongod",
]);

const SUSPICIOUS_PORTS = new Set([
  4444, 1337, 6666, 8888, 9999, 31337, 12345, 54321,
]);
const HIGH_RISK_COUNTRIES = new Set(["CN", "RU", "KP", "IR", "NG", "RO"]);

const eventSchema = z.object({
  userId: z.string().optional().default("agent"),
  processName: z.string().min(1),
  pid: z.string(),
  remoteAddress: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
  remotePort: z.string(),
  timestamp: z.string().optional(),
  threatLevel: z.string().optional(),
  source: z.string().optional().default("agent_telemetry"),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1),
});

function isPrivateIp(ip: string): boolean {
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function scoreThreat(
  processName: string,
  port: number,
  countryCode: string | null,
): { score: number; level: string } {
  let score = 20;
  const pName = processName.toLowerCase();

  if (SUSPICIOUS_PORTS.has(port)) score += 40;
  if (!SAFE_PROCESSES.has(pName)) score += 20;
  if (countryCode && HIGH_RISK_COUNTRIES.has(countryCode.toUpperCase()))
    score += 30;
  if (port === 22 && pName !== "sshd" && pName !== "ssh") score += 25;
  if (port === 3389) score += 35;
  if (pName.length < 4 || /^[a-z]{1,3}[0-9]+$/.test(pName)) score += 30;

  const level =
    score >= 70
      ? "critical"
      : score >= 50
        ? "high"
        : score >= 30
          ? "medium"
          : "low";
  return { score, level };
}

interface GeoResult {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  isp: string | null;
}

async function enrichGeoIp(ip: string): Promise<GeoResult> {
  const fallback: GeoResult = {
    country: null,
    countryCode: null,
    city: null,
    isp: null,
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const base = process.env.GEO_IP_API || "http://ip-api.com/json";
    const res = await fetch(
      `${base}/${ip}?fields=country,countryCode,city,isp,org,as,query`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || null,
      isp: data.isp || null,
    };
  } catch {
    return fallback;
  }
}

async function fireDiscordAlert(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **Endpoint Agent Alert**\n${message}`,
      }),
    });
  } catch {
    // Discord alert is best-effort
  }
}

export async function POST(request: Request) {
  // 1. Authenticate via AGENT_SECRET bearer token
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.AGENT_SECRET;
  const providedToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  if (
    !expectedToken ||
    !providedToken ||
    !safeCompare(providedToken, expectedToken)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = bodySchema.safeParse(rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 },
    );
  }

  const { events } = validation.data;
  const supabase = getSupabaseAdmin();
  const results: {
    remoteAddress: string;
    threatLevel: string;
    threatScore: number;
    country: string | null;
  }[] = [];
  let flagged = 0;

  for (const event of events) {
    try {
      // 3. Skip private IPs
      if (isPrivateIp(event.remoteAddress)) continue;

      // 4. Geo-IP Enrichment
      const geo = await enrichGeoIp(event.remoteAddress);

      // 5. Score threat
      const port = parseInt(event.remotePort, 10) || 0;
      const { score, level } = scoreThreat(
        event.processName,
        port,
        geo.countryCode,
      );

      // 6. Insert into endpoint_events
      await supabase.from("endpoint_events").insert({
        user_id: event.userId || "agent",
        process_name: event.processName,
        pid: event.pid,
        remote_address: event.remoteAddress,
        remote_port: port,
        country: geo.country,
        country_code: geo.countryCode,
        city: geo.city,
        isp: geo.isp,
        threat_level: level,
        threat_score: score,
        source: event.source || "agent_telemetry",
        timestamp: event.timestamp || new Date().toISOString(),
        raw_event: event as unknown as Record<string, unknown>,
      });

      results.push({
        remoteAddress: event.remoteAddress,
        threatLevel: level,
        threatScore: score,
        country: geo.country,
      });

      // 7. Auto-block critical/high
      if (level === "critical" || level === "high") {
        flagged++;

        // Upsert into proprietary_intel
        await supabase.from("proprietary_intel").upsert(
          {
            indicator: event.remoteAddress,
            type: "ipv4",
            severity: level,
            source: "Endpoint Agent Auto-Block",
            description: `Auto-flagged: ${event.processName} (PID ${event.pid}) → ${event.remoteAddress}:${event.remotePort} | Score: ${score} | ${geo.country || "Unknown"}`,
          },
          { onConflict: "indicator" },
        );

        // Fire Discord alert
        await fireDiscordAlert(
          `**${level.toUpperCase()}** — \`${event.processName}\` (PID ${event.pid}) → \`${event.remoteAddress}:${event.remotePort}\`\n` +
            `Score: ${score} | Location: ${geo.city || "?"}, ${geo.country || "?"} (${geo.countryCode || "?"}) | ISP: ${geo.isp || "?"}`,
        );
      }
    } catch (err) {
      console.error(
        `[flag-ioc] Error processing event ${event.remoteAddress}:`,
        err,
      );
      // Continue to next event
    }
  }

  return NextResponse.json({
    processed: results.length,
    flagged,
    results,
  });
}
