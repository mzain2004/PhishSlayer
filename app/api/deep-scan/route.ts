import { NextResponse } from "next/server";
import { getWhoisData } from "@/lib/deep-scan/whois";
import { checkDnsRecords } from "@/lib/deep-scan/dnsCheck";
import { getSslProfile } from "@/lib/deep-scan/sslProfile";
import { detectTyposquatting } from "@/lib/deep-scan/typosquat";
import { getDomTree } from "@/lib/deep-scan/domTree";
import { sanitizeTarget } from "@/lib/security/safeCompare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stripTarget(input: string): string {
  let d = input.trim();
  d = d.replace(/^https?:\/\//i, "");
  d = d.replace(/^www\./i, "");
  d = d.replace(/\/+$/, "");
  d = d.split("/")[0];
  return d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTarget = searchParams.get("target");

    if (!rawTarget || !rawTarget.trim()) {
      return NextResponse.json(
        { error: "Missing required parameter: target" },
        { status: 400 },
      );
    }

    const stripped = stripTarget(rawTarget);

    // Validate sanitized target
    const { target, error: sanitizeError } = sanitizeTarget(stripped);
    if (sanitizeError || !target) {
      return NextResponse.json(
        { error: sanitizeError || "Invalid target." },
        { status: 400 },
      );
    }

    // Run all 5 modules in parallel — never let one failure block others
    const [whoisResult, dnsResult, sslResult, typosquatResult, domTreeResult] =
      await Promise.allSettled([
        getWhoisData(target),
        checkDnsRecords(target),
        getSslProfile(target),
        detectTyposquatting(target),
        getDomTree(target),
      ]);

    const whois = whoisResult.status === "fulfilled" ? whoisResult.value : null;
    const dns = dnsResult.status === "fulfilled" ? dnsResult.value : null;
    const ssl = sslResult.status === "fulfilled" ? sslResult.value : null;
    const typosquat =
      typosquatResult.status === "fulfilled" ? typosquatResult.value : null;
    const domTree =
      domTreeResult.status === "fulfilled" ? domTreeResult.value : null;

    // Merge all risk flags into a flat, deduplicated array
    const allRiskFlags: string[] = [];
    const flagSet = new Set<string>();

    const sources = [
      whois && "riskFlags" in whois
        ? (whois as Record<string, unknown>).riskFlags
        : null,
      dns?.riskFlags,
      ssl?.riskFlags,
      typosquat?.riskFlags,
      domTree?.riskFlags,
    ];

    for (const flags of sources) {
      if (Array.isArray(flags)) {
        for (const flag of flags) {
          if (typeof flag === "string" && !flagSet.has(flag)) {
            flagSet.add(flag);
            allRiskFlags.push(flag);
          }
        }
      }
    }

    return NextResponse.json({
      target,
      whois,
      dns,
      ssl,
      typosquat,
      domTree,
      allRiskFlags,
    });
  } catch {
    // Never return 500 — return partial results
    return NextResponse.json({
      target: "",
      whois: null,
      dns: null,
      ssl: null,
      typosquat: null,
      domTree: null,
      allRiskFlags: ["Deep scan encountered an unexpected error"],
    });
  }
}
