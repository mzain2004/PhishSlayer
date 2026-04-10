import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "lib",
      "agent",
      "endpointMonitor.ts",
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Agent file not found" },
        { status: 404 },
      );
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": 'attachment; filename="endpointMonitor.ts"',
      },
    });
  } catch (error: any) {
    console.error("[API] Error serving agent file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
