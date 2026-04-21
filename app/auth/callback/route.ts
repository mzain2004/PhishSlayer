import { NextResponse } from "next/server";

// Supabase OAuth callback route is no longer needed.
// Clerk handles all OAuth callbacks internally.
// This route returns a 410 Gone response to indicate it is intentionally removed.
export async function GET() {
  return NextResponse.json(
    { error: "Auth callback route removed — Clerk handles OAuth." },
    { status: 410 },
  );
}
