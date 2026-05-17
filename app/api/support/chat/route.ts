import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { groqComplete } from "@/lib/ai/groq";
import { sanitizePromptInput } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
}).strict();

function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request payload" },
        { status: 400 },
      );
    }

    const serviceClient = createServiceRoleClient();

    const userMessage = parsed.data.message;
    const safeMessage = sanitizePromptInput(userMessage, 2000);

    // Check AI rate limits
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('api_calls_today, api_calls_reset_at')
      .eq('id', userId)
      .single();

    let calls = profile?.api_calls_today || 0;
    let resetAt = profile?.api_calls_reset_at ? new Date(profile.api_calls_reset_at) : new Date(0);
    const now = new Date();

    if (now >= resetAt) {
      calls = 0;
      resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    }

    if (calls >= 50) {
      return NextResponse.json({ message: "Daily AI limit reached" }, { status: 429 });
    }

    let reply = "";
    try {
      const responseText = await groqComplete(
        "You are PhishSlayer AI Support, an expert cybersecurity SOC assistant embedded in the PhishSlayer Autonomous SOC platform. Help users navigate the platform, understand their alerts, use features like URL scanning, static analysis, Sigma rules, CTEM, agent reasoning chains, and SOC metrics. Be concise, technical, and helpful. Never ask the user to sign in — they are already authenticated.",
        safeMessage,
        500,
      );

      // Increment AI calls after success
      await serviceClient.from('profiles').update({
        api_calls_today: calls + 1,
        api_calls_reset_at: resetAt.toISOString()
      }).eq('id', userId);

      reply = responseText.trim() || "I couldn't process that. Try again.";
    } catch (error) {
      console.warn("Support chat fallback used", {
        error: "INTERNAL_SERVER_ERROR",
      });
      reply = "Support is temporarily unavailable. Try again shortly.";
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("[support-chat] error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
