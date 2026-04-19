import { NextResponse } from "next/server";
import { z } from "zod";
import { geminiGenerateText } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  userId: z.string().optional().nullable(),
  userEmail: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set for /api/support-chat");
      return NextResponse.json(
        { error: "Support service is unavailable" },
        { status: 500 },
      );
    }

    const prompt = `You are Phish-Slayer AI Support, an expert cybersecurity SOC assistant. Help users navigate the platform, understand alerts, use features, and resolve issues. Be concise and technical.

  Context:
  - User ID: ${parsed.data.userId || "unknown"}
  - User Email: ${parsed.data.userEmail || "unknown"}

  User message: ${parsed.data.message}`;

    let reply = "";
    try {
      const responseText = await geminiGenerateText(
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        },
        { context: "support-chat" },
      );

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
