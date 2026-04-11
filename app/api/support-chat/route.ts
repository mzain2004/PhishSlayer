import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

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

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set for /api/support-chat");
      return NextResponse.json(
        { error: "Support service is unavailable" },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are Phish-Slayer AI Support, an expert cybersecurity SOC assistant. Help users navigate the platform, understand alerts, use features, and resolve issues. Be concise and technical.

  Context:
  - User ID: ${parsed.data.userId || "unknown"}
  - User Email: ${parsed.data.userEmail || "unknown"}

  User message: ${parsed.data.message}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const reply =
      (result.text || "").trim() ||
      "I can help with that. Please share a bit more detail.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Support chat route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
