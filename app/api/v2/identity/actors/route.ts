import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchNonHumanIdentities } from "@/lib/microsoft/signInIngestion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actors = await fetchNonHumanIdentities();
    return NextResponse.json({ actors, count: actors.length });
  } catch (error) {
    console.error("Actors API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch actors" },
      { status: 500 },
    );
  }
}
