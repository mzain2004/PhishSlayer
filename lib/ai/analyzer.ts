"use server";

import { groqComplete } from "@/lib/ai/groq";
import { sanitizePromptInput } from "@/lib/security/sanitize";

export async function analyzeThreat(incidentDescription: string) {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY is not set. Skipping AI analysis.");
    return null;
  }

  const systemPrompt =
    "You are an elite Level 3 SOC Analyst. Analyze this incident description. Return ONLY a valid JSON object with exactly three keys: risk_score (number 1-10), threat_category (string), and remediation_steps (array of 3 strings). No markdown formatting, no conversational text.";
  const safeDescription = sanitizePromptInput(incidentDescription, 4000);
  const userPrompt = `Incident Description:\n${safeDescription}`;

  try {
    let text = await groqComplete(systemPrompt, userPrompt);

    // Clean up potential markdown formatting that the model might include despite instructions
    if (text.startsWith("```json")) {
      text = text
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/^```/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
}

export async function scoreCtiFinding(summary: {
  last_analysis_stats: Record<string, number>;
  reputation: number;
  meaningful_name?: string;
}): Promise<{
  risk_score: number;
  threat_category: string;
  ai_summary: string;
} | null> {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const systemPrompt =
    "You are an elite Level 3 SOC Analyst. Review this stripped VirusTotal threat data. Return ONLY a valid JSON object with exactly three keys: risk_score (number 1-10), threat_category (string), and ai_summary (a concise, 2-sentence summary of the threat level and reputation). No markdown formatting, no conversational text.";
  const safeSummary = sanitizePromptInput(
    JSON.stringify(summary, null, 2),
    4000,
  );
  const userPrompt = `VirusTotal Data:\n${safeSummary}`;

  try {
    let text = await groqComplete(systemPrompt, userPrompt);

    if (text.startsWith("\`\`\`json")) {
      text = text
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (text.startsWith("\`\`\`")) {
      text = text.replace(/^```/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("CTI Scoring Error:", error);
    return null;
  }
}
