import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiSuccess, apiError, API_CODES } from "@/lib/api/response";
import { createCipheriv, randomBytes } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALL_TOOLS = [
  { name: "virustotal",    label: "VirusTotal",      category: "Threat Intel",  needs_key: true },
  { name: "shodan",        label: "Shodan",           category: "Recon",         needs_key: true },
  { name: "abuseipdb",    label: "AbuseIPDB",        category: "Reputation",    needs_key: true },
  { name: "urlscan",       label: "URLScan.io",       category: "URL Analysis",  needs_key: true },
  { name: "greynoise",     label: "GreyNoise",        category: "Noise Intel",   needs_key: true },
  { name: "hibp",          label: "HaveIBeenPwned",  category: "Breach Intel",  needs_key: true },
  { name: "hunter",        label: "Hunter.io",        category: "Email Intel",   needs_key: true },
  { name: "otx",           label: "AlienVault OTX",  category: "Threat Intel",  needs_key: true },
  { name: "censys",        label: "Censys",           category: "Recon",         needs_key: true },
  { name: "misp",          label: "MISP",             category: "Threat Sharing",needs_key: true },
  { name: "opencti",       label: "OpenCTI",          category: "Threat Sharing",needs_key: true },
  { name: "crtsh",         label: "crt.sh",           category: "Cert Trans.",   needs_key: false },
  { name: "urlhaus",       label: "URLhaus",          category: "Malware",       needs_key: false },
  { name: "threatfox",     label: "ThreatFox",        category: "Malware",       needs_key: false },
  { name: "malwarebazaar", label: "MalwareBazaar",    category: "Malware",       needs_key: false },
  { name: "passivedns",    label: "Passive DNS",      category: "Recon",         needs_key: false },
  { name: "whois",         label: "WHOIS",            category: "Recon",         needs_key: false },
];

function encryptApiKey(plaintext: string): string {
  const keyB64 = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!keyB64) throw new Error("CREDENTIAL_ENCRYPTION_KEY not set");
  const key = Buffer.from(keyB64, "base64");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(nonce + ciphertext + tag) — matches Python AESGCM.decrypt
  return Buffer.concat([nonce, encrypted, tag]).toString("base64");
}

const saveSchema = z.object({
  tool_name: z.string().min(1),
  api_key: z.string().min(1),
});

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { data: existing } = await supabaseAdmin
    .from("org_integrations")
    .select("tool_name, enabled")
    .eq("org_id", orgId);

  const customTools = new Set((existing ?? []).map((r: { tool_name: string }) => r.tool_name));

  const tools = ALL_TOOLS.map((t) => ({
    ...t,
    using_custom_key: customTools.has(t.name),
    using_phishslayer_key: !customTools.has(t.name) || !t.needs_key,
  }));

  return apiSuccess({ tools });
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch {
    return apiError(API_CODES.VALIDATION_ERROR, "Invalid JSON", 400);
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return apiError(API_CODES.VALIDATION_ERROR, "Invalid input", 400);

  const { tool_name, api_key } = parsed.data;

  let encrypted: string;
  try {
    encrypted = encryptApiKey(api_key);
  } catch {
    return apiError(API_CODES.INTERNAL_ERROR, "Encryption not configured", 500);
  }

  const { error } = await supabaseAdmin.from("org_integrations").upsert(
    {
      org_id: orgId,
      tool_name,
      enabled: true,
      encrypted_credentials: { api_key: encrypted },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,tool_name" }
  );

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Failed to save integration", 500);

  return apiSuccess({ message: `${tool_name} key saved` });
}

export async function DELETE(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const tool_name = searchParams.get("tool");
  if (!tool_name) return apiError(API_CODES.VALIDATION_ERROR, "tool query param required", 400);

  const { error } = await supabaseAdmin
    .from("org_integrations")
    .delete()
    .eq("org_id", orgId)
    .eq("tool_name", tool_name);

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Failed to remove integration", 500);

  return apiSuccess({ message: `${tool_name} reverted to PhishSlayer default` });
}
