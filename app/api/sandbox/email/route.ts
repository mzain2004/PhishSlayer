import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { parseEmailHeaders } from "@/lib/email/headerParser";
import { analyzeHeadersWithGroq } from "@/lib/email/groqAnalyzer";
import { detonateUrls, aggregateVerdicts } from "@/lib/sandbox/detonator";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EmailSandboxSchema = z.object({
  rawEmail: z.string(),
});

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rawEmail } = EmailSandboxSchema.parse(body);

    // 1. Header Analysis
    const headerParsed = await parseEmailHeaders(rawEmail);
    const headerGroq = await analyzeHeadersWithGroq(rawEmail, headerParsed);

    // 2. URL Detonation
    const urlResults = await detonateUrls(rawEmail);
    const overallUrlVerdict = aggregateVerdicts(urlResults);

    // 3. Save Header Analysis
    const supabase = await createClient();
    await supabase.from("email_analyses").insert({
      organization_id: orgId,
      raw_headers: rawEmail.substring(0, rawEmail.indexOf("\n\n")), // Crude header extract
      parsed_data: headerParsed,
      groq_analysis: headerGroq,
      risk_score: headerParsed.riskScore,
      flags: headerParsed.suspiciousFlags,
    });

    // 4. Save URL Scans
    const urlEntries = Object.entries(urlResults).map(([url, result]) => ({
      organization_id: orgId,
      url,
      verdict: result.verdict,
      score: Math.round(result.score),
      scan_results: result,
    }));
    if (urlEntries.length > 0) {
      await supabase.from("url_scans").insert(urlEntries);
    }

    return NextResponse.json({
      headers: {
        parsed: headerParsed,
        ai: headerGroq,
      },
      urls: {
        results: urlResults,
        verdict: overallUrlVerdict,
      },
      overallRisk: Math.max(
        headerParsed.riskScore,
        overallUrlVerdict === "malicious"
          ? 100
          : overallUrlVerdict === "suspicious"
            ? 70
            : 0,
      ),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Email Sandbox error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
