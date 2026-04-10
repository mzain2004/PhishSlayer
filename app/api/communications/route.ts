import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface EmailPayload {
  type?: string;
  userEmail?: string;
  email?: string;
  name?: string;
  message?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    console.log("Communications POST: start");
    const payload: EmailPayload = await request.json();
    console.log("Communications payload:", payload);

    const email = (payload.email || payload.userEmail || "")
      .trim()
      .toLowerCase();
    console.log("Communications normalized email:", email);

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    console.log("Communications supabase client created");

    const { data, error } = await supabase
      .from("waitlist")
      .upsert({ email }, { onConflict: "email" })
      .select();

    console.log("Communications upsert result:", { data, error });

    if (error) {
      console.error("Communications DB save error:", error);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    console.log("Communications resend key present:", !!resendApiKey);
    if (resendApiKey) {
      try {
        console.log("Communications sending welcome email");
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
        console.log("Communications welcome email sent request complete");
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
