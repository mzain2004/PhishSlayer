import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildGeminiAnalysisPrompt,
  calculateEntropy,
  checkVirusTotal,
  extractSuspiciousStrings,
  mapEntropyRisk,
  saveStaticAnalysis,
  type VirusTotalResult,
} from "@/lib/static-analysis";
import { mapToMitre, type MitreTechnique } from "@/lib/mitre-mapper";
import { saveReasoningChain } from "@/lib/reasoning-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const StaticAnalysisRequestSchema = z.object({
  file_name: z.string().min(1),
  file_content_base64: z.string(),
  file_hash_sha256: z.string().min(32).optional(),
  file_hash_md5: z.string().min(16).optional(),
  alert_id: z.string().uuid().optional(),
});

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  verdict: z.enum(["clean", "suspicious", "malicious", "unknown"]).optional(),
});

const GeminiApiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
});

const GeminiStructuredSchema = z.object({
  threat_classification: z.enum([
    "clean",
    "suspicious",
    "malicious",
    "unknown",
  ]),
  risk_score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  mitre_techniques: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        confidence: z.number().min(0).max(1).optional().default(0.5),
      }),
    )
    .default([]),
  recommended_actions: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function inferFileType(buffer: Buffer, fileName: string): string {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return "pe-executable";
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return "zip-archive";
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension ? `unknown/${extension}` : "unknown";
}

function extractPrintableStrings(buffer: Buffer): string[] {
  const data = buffer.toString("latin1");
  return data
    .split(/[\x00\s]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 4)
    .filter((value) => /^[\x20-\x7E]+$/.test(value));
}

function derivePeImports(strings: string[]): string[] {
  const importPattern =
    /(CreateRemoteThread|VirtualAlloc|WriteProcessMemory|LoadLibrary|GetProcAddress|RegSetValue|WinExec|ShellExecute|InternetOpen|URLDownloadToFile)/i;
  return Array.from(
    new Set(strings.filter((item) => importPattern.test(item))),
  );
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function runGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini failed (${response.status}): ${details}`);
  }

  const body = await response.json();
  const parsedGemini = GeminiApiResponseSchema.safeParse(body);
  if (!parsedGemini.success) {
    throw new Error("Gemini response schema invalid");
  }

  const text =
    parsedGemini.data.candidates?.[0]?.content.parts
      .map((part) => part.text || "")
      .join("")
      .trim() || "";

  const cleaned = stripCodeFence(text);
  const parsedJson = JSON.parse(cleaned);
  const parsedStructured = GeminiStructuredSchema.safeParse(parsedJson);

  if (!parsedStructured.success) {
    throw new Error("Gemini structured analysis validation failed");
  }

  return parsedStructured.data;
}

function combineMitre(
  heuristicMitre: MitreTechnique[],
  geminiMitre: Array<{ id: string; name: string; confidence?: number }>,
): MitreTechnique[] {
  const all = [...heuristicMitre];
  const seen = new Set(heuristicMitre.map((item) => item.id));

  for (const entry of geminiMitre) {
    if (seen.has(entry.id)) {
      continue;
    }

    seen.add(entry.id);
    all.push({
      id: entry.id,
      name: entry.name,
      confidence: entry.confidence ?? 0.5,
    });
  }

  return all;
}

function fallbackVerdict(
  entropy: number,
  suspiciousCount: number,
  vt: VirusTotalResult,
): { verdict: "clean" | "suspicious" | "malicious" | "unknown"; risk: number } {
  if (vt.detected >= 5) {
    return { verdict: "malicious", risk: 90 };
  }

  if (vt.detected > 0 || suspiciousCount > 5 || entropy > 6) {
    return { verdict: "suspicious", risk: 65 };
  }

  if (suspiciousCount === 0 && entropy < 4) {
    return { verdict: "clean", risk: 5 };
  }

  return { verdict: "unknown", risk: 35 };
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const payload = await request.json();
    const parsedPayload = StaticAnalysisRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      file_name,
      file_content_base64,
      file_hash_sha256,
      file_hash_md5,
      alert_id,
    } = parsedPayload.data;

    if (!file_content_base64 && !file_hash_sha256 && !file_hash_md5) {
      return NextResponse.json(
        {
          success: false,
          error: "Either file_content_base64 or file hash is required",
        },
        { status: 400 },
      );
    }

    const buffer = file_content_base64
      ? Buffer.from(file_content_base64, "base64")
      : Buffer.alloc(0);

    const entropy = calculateEntropy(buffer.toString("latin1"));
    const entropyRisk = mapEntropyRisk(entropy);
    const stringsExtracted = extractPrintableStrings(buffer).slice(0, 5000);
    const suspiciousStrings = extractSuspiciousStrings(stringsExtracted).slice(
      0,
      500,
    );
    const fileType = inferFileType(buffer, file_name);
    const peImports = derivePeImports(stringsExtracted);
    const peSections =
      fileType === "pe-executable" ? [".text", ".rdata", ".data"] : [];

    let vt = {
      detected: 0,
      total: 0,
      score: "0/0",
      permalink: null,
      result: {},
    } as VirusTotalResult;

    if (file_hash_sha256 || file_hash_md5) {
      try {
        vt = await checkVirusTotal(file_hash_sha256 || file_hash_md5 || "");
      } catch (vtError) {
        vt = {
          detected: 0,
          total: 0,
          score: "0/0",
          permalink: null,
          result: {
            error:
              vtError instanceof Error
                ? vtError.message
                : "VirusTotal check failed",
          },
        };
      }
    }

    const prompt = buildGeminiAnalysisPrompt({
      fileName: file_name,
      fileType,
      entropy,
      suspiciousStrings,
      vtScore: vt.score,
      peImports,
    });

    const heuristicMitre = mapToMitre(suspiciousStrings, peImports);

    let geminiReport = "Gemini analysis unavailable";
    let verdict: "clean" | "suspicious" | "malicious" | "unknown" = "unknown";
    let riskScore = 0;
    let finalMitre = heuristicMitre;
    let recommendedActions: string[] = [];

    try {
      const gemini = await runGemini(prompt);
      geminiReport = gemini.summary;
      verdict = gemini.threat_classification;
      riskScore = gemini.risk_score;
      finalMitre = combineMitre(heuristicMitre, gemini.mitre_techniques);
      recommendedActions = gemini.recommended_actions;
    } catch (geminiError) {
      const fallback = fallbackVerdict(entropy, suspiciousStrings.length, vt);
      verdict = fallback.verdict;
      riskScore = fallback.risk;
      geminiReport =
        geminiError instanceof Error
          ? `Gemini unavailable: ${geminiError.message}`
          : "Gemini unavailable";
    }

    const analysisDurationMs = Date.now() - startedAt;

    const analysisId = await saveStaticAnalysis({
      alert_id: alert_id || null,
      file_name,
      file_hash_md5: file_hash_md5 || null,
      file_hash_sha256: file_hash_sha256 || null,
      file_size_bytes: buffer.length,
      file_type: fileType,
      entropy_score: entropy,
      entropy_risk: entropyRisk,
      strings_extracted: stringsExtracted,
      suspicious_strings: suspiciousStrings,
      virustotal_score: vt.score,
      virustotal_detected: vt.detected,
      virustotal_total: vt.total,
      virustotal_result: vt.result,
      pe_imports: peImports,
      pe_sections: peSections,
      mitre_techniques: finalMitre,
      gemini_report: geminiReport,
      risk_score: riskScore,
      verdict,
      analysis_duration_ms: analysisDurationMs,
    });

    await saveReasoningChain({
      alert_id,
      agent_level: "L3",
      decision: verdict,
      confidence_score: riskScore / 100,
      reasoning_text: geminiReport,
      iocs_considered: [
        {
          suspicious_strings: suspiciousStrings.slice(0, 50),
          virustotal_score: vt.score,
          mitre_techniques: finalMitre,
        },
      ],
      actions_taken:
        recommendedActions.length > 0
          ? recommendedActions
          : ["isolate file", "perform memory triage", "contain host"],
      model_used: "gemini-2.5-flash",
      execution_time_ms: analysisDurationMs,
    });

    return NextResponse.json({
      success: true,
      analysis_id: analysisId,
      report: {
        file_name,
        file_hash_sha256: file_hash_sha256 || null,
        entropy_score: entropy,
        entropy_risk: entropyRisk,
        suspicious_strings: suspiciousStrings,
        virustotal: {
          score: vt.score,
          detected: vt.detected,
          total: vt.total,
          permalink: vt.permalink,
        },
        mitre_techniques: finalMitre,
        gemini_report: geminiReport,
        risk_score: riskScore,
        verdict,
        analysis_duration_ms: analysisDurationMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Static analysis pipeline failed unexpectedly",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = QuerySchema.safeParse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
      verdict: searchParams.get("verdict") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { page, limit, verdict } = parsedQuery.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const client = getAdminClient();
    let query = client
      .from("static_analysis")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (verdict) {
      query = query.eq("verdict", verdict);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch static analysis records",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    );
  }
}
