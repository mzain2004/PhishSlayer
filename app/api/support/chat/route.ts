import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { geminiGenerateText } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request payload" },
        { status: 400 },
      );
    }

    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Please sign in first" },
        { status: 401 },
      );
    }

    const serviceClient = createServiceRoleClient();
    await serviceClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const userMessage = parsed.data.message;

    let reply = "";
    try {
      const responseText = await geminiGenerateText(
        {
          systemInstruction: {
            parts: [
              {
                text: "You are Phish-Slayer AI Support, an expert cybersecurity SOC assistant embedded in the Phish-Slayer Autonomous SOC platform. Help users navigate the platform, understand their alerts, use features like URL scanning, static analysis, Sigma rules, CTEM, agent reasoning chains, and SOC metrics. Be concise, technical, and helpful. Never ask the user to sign in — they are already authenticated.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        },
        { context: "support-chat-auth" },
      );

      reply =
        responseText.trim() || "I couldn't process that. Try again.";
    } catch (error) {
      console.warn("Support chat fallback used", {
        error: error instanceof Error ? error.message : "unknown",
      });
      reply = "Support is temporarily unavailable. Try again shortly.";
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong, try again",
      },
      { status: 500 },
    );
  }
}
