import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthenticatedUser } from "@/lib/tenancy";
import { getServerRole } from "@/lib/rbac/serverRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getServerRole();
    if (!role || !["admin", "manager", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
