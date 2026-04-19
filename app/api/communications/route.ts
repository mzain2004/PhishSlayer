import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EmailPayloadSchema = z.object({
  type: z.string().trim().min(1).max(50).optional(),
  userEmail: z.string().email().optional(),
  email: z.string().email().optional(),
  name: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
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
    const rate = checkRateLimit(`communications:${user.id}:${clientIp}`, {
      windowMs: 60_000,
      max: 3,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = EmailPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid communications payload" },
        { status: 400 },
      );
    }

    const email = (parsed.data.email || parsed.data.userEmail || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("waitlist")
      .upsert({ email }, { onConflict: "email" })
      .select();

    if (error) {
      console.error("Communications DB save error:", error);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Phish-Slayer <support@phishslayer.tech>",
            to: [email],
            subject: "Welcome to Phish-Slayer Updates",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2DD4BF;">Welcome to Phish-Slayer 🛡️</h2>
                <p>Thanks for subscribing! You'll be the first to know about:</p>
                <ul>
                  <li>New threat intelligence features</li>
                  <li>Adaptive Defense Engine launch</li>
                  <li>Platform updates and security insights</li>
                </ul>
                <p>In the meantime, check out the platform:</p>
                <a href="https://phishslayer.tech"
                  style="background: #2DD4BF; color: #0D1117;
                  padding: 12px 24px; border-radius: 6px;
                  text-decoration: none; display: inline-block;">
                  Visit Phish-Slayer
                </a>
                <p style="color: #8B949E; margin-top: 24px; font-size: 12px;">
                  You can unsubscribe at any time by replying to this email.
                </p>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Welcome email send failed:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll be in touch. 🚀",
    });
  } catch (error) {
    console.error("Communications route error:", error);
    return NextResponse.json({ success: true });
  }
}
