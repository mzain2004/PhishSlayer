import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const tier = typeof body?.tier === "string" && body.tier.trim() ? body.tier.trim() : "adaptive_defense";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("waitlist")
      .upsert(
        {
          email,
          tier,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "email,tier",
        },
      );

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: true });
      }
      console.error("Waitlist API error:", error);
      return NextResponse.json({ error: "Failed to save waitlist entry." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist API unexpected error:", error);
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
