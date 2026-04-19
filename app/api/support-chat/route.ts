import { NextResponse } from "next/server";
import { z } from "zod";
import { groqComplete } from "@/lib/ai/groq";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { sanitizePromptInput } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  userId: z.string().optional().nullable(),
  userEmail: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`support-chat:${user.id}:${clientIp}`, {
      windowMs: 60_000,
      max: 6,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set for /api/support-chat");
      return NextResponse.json(
        { error: "Support service is unavailable" },
        { status: 500 },
      );
    }

    const systemPrompt =
      "You are Phish-Slayer AI Support, an expert cybersecurity SOC assistant. Help users navigate the platform, understand alerts, use features, and resolve issues. Be concise and technical.";
    const safeMessage = sanitizePromptInput(parsed.data.message, 2000);
    const safeUserId = sanitizePromptInput(parsed.data.userId || user.id, 80);
    const userPrompt = `Context:\n- User ID: ${safeUserId}\n\nUser message: ${safeMessage}`;

    let reply = "";
    try {
      const responseText = await groqComplete(systemPrompt, userPrompt, 512);

      reply =
        responseText.trim() ||
        "I can help with that. Please share a bit more detail.";
    } catch (error) {
      console.warn("Support chat fallback used", {
        error: error instanceof Error ? error.message : "unknown",
      });
      reply = "Support is temporarily unavailable. Try again shortly.";
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Support chat route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
