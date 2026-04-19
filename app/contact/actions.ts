"use server";

import { Resend } from "resend";
import { headers } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY!);

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitByIp = new Map<
  string,
  { count: number; resetAt: number }
>();

async function getClientIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") || "";
  const realIp = headerList.get("x-real-ip") || "";
  const candidate = forwarded.split(",")[0]?.trim() || realIp.trim();
  return candidate || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  for (const [key, value] of rateLimitByIp.entries()) {
    if (value.resetAt <= now) rateLimitByIp.delete(key);
  }

  const entry = rateLimitByIp.get(ip);
  if (!entry) {
    rateLimitByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.resetAt <= now) {
    rateLimitByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

export async function submitContact(formData: FormData) {
  try {
    const ip = await getClientIp();
    if (isRateLimited(ip)) {
      return { error: "Too many requests", status: 429 };
    }

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const company = formData.get("company") as string;
    const type = formData.get("type") as string;
    const message = formData.get("message") as string;

    if (!firstName || !lastName || !email || !message) {
      return { error: "Missing required fields" };
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return { error: "Email service not configured. Please try again later." };
    }

    await resend.emails.send({
      from: "Phish-Slayer System <onboarding@resend.dev>", // using resend test domain
      to: "support@phishslayer.tech",
      subject: `[${type}] New Contact from ${firstName} ${lastName}`,
      html: `
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Inquiry Type:</strong> ${type}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Contact form error:", err);
    return { error: err.message || "Something went wrong" };
  }
}
