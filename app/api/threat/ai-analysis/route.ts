import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from '@clerk/nextjs/server';
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/auditLogger";
import { groqComplete } from "@/lib/ai/groq";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { sanitizePromptInput } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  domText: z.string().max(50000),
  target: z.string().min(1).max(253),
  existingRiskScore: z.number().min(0).max(100),
});

const SYSTEM_PROMPT = `You are a cybersecurity AI specializing in phishing and social engineering detection. Analyze the provided webpage text and identify:
1. Psychological manipulation tactics (urgency, fear, scarcity, authority)
2. Credential harvesting patterns (fake login forms, password requests)
3. Brand impersonation signals
4. Deceptive UI patterns

Return ONLY a valid JSON object with NO markdown, NO backticks:
{
  "heuristic_score": <1-10 integer, 10 = definitely malicious>,
  "threat_summary": "<2-3 sentence summary>",
  "key_indicators": ["<indicator 1>", "<indicator 2>"],
  "manipulation_tactics": ["<tactic 1>", "<tactic 2>"],
  "credential_harvesting_signals": ["<signal 1>", "<signal 2>"],
  "confidence": "<low|medium|high>"
}`;

export async function POST(request: Request) {
  try {
    // Auth check
    const { userId } = await auth();
  if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`ai-heuristic:${userId}:${clientIp}`, {
      windowMs: 60_000,
      max: 5,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // Validate body
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

    const { domText, target, existingRiskScore } = validation.data;

    // Truncate domText if very long
    const truncatedText =
      domText.length > 50000 ? domText.slice(0, 50000) : domText;
    const safeTarget = sanitizePromptInput(target, 300);
    const safeText = sanitizePromptInput(truncatedText, 50000);

    // Call Groq for heuristic analysis
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }

    let responseText = "";
    try {
      responseText = await groqComplete(
        SYSTEM_PROMPT,
        `--- WEBPAGE TEXT FROM: ${safeTarget} ---\n${safeText}\n--- END ---`,
      );
    } catch (error) {
      console.warn("AI heuristic analysis fallback used", {
        error: error instanceof Error ? error.message : "unknown",
      });

      const heuristicScore = Math.max(
        1,
        Math.min(10, Math.round(existingRiskScore / 10) || 5),
      );
      const combinedRiskScore = Math.round(
        existingRiskScore * 0.8 + heuristicScore * 10 * 0.2,
      );

      return NextResponse.json({
        heuristicScore,
        summary: "AI analysis unavailable; using baseline risk score.",
        indicators: [],
        manipulationTactics: [],
        credentialHarvestingSignals: [],
        combinedRiskScore,
        confidence: "low",
        analyzedAt: new Date().toISOString(),
      });
    }

    // Parse JSON safely — strip markdown fences if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Groq response:", cleaned.slice(0, 200));
      return NextResponse.json(
        {
          error: "AI returned invalid response format",
        },
        { status: 502 },
      );
    }

    // Calculate combined risk score
    const heuristicScore = Math.max(
      1,
      Math.min(10, parsed.heuristic_score || 5),
    );
    const combinedRiskScore = Math.round(
      existingRiskScore * 0.6 + heuristicScore * 10 * 0.4,
    );

    // Audit
    await logAuditEvent({
      action: "ai_heuristic_analysis",
      resource_type: "scan",
      resource_id: target,
      details: {
        heuristicScore,
        combinedRiskScore,
        confidence: parsed.confidence,
      },
    });

    return NextResponse.json({
      heuristicScore,
      summary: parsed.threat_summary || "Analysis complete.",
      indicators: parsed.key_indicators || [],
      manipulationTactics: parsed.manipulation_tactics || [],
      credentialHarvestingSignals: parsed.credential_harvesting_signals || [],
      combinedRiskScore,
      confidence: parsed.confidence || "medium",
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("AI heuristic analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}
