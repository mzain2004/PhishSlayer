import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CommandSchema = z.object({
  agentId: z.string().uuid(),
  command: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Role verification (must be manager or higher)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (
      !profile ||
      (profile.role !== "manager" &&
        profile.role !== "admin" &&
        profile.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CommandSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { agentId, command, payload } = parsed.data;

    const validCommands = [
      "block_ip",
      "kill_process",
      "quarantine_file",
      "ping",
      "isolate",
    ];
    if (!validCommands.includes(command)) {
      return NextResponse.json({ error: "Invalid command" }, { status: 400 });
    }

    // Call the globally exposed agentControl from server.js
    if (!(global as any).agentControl?.sendCommandToAgent) {
      return NextResponse.json(
        { error: "WebSocket server not initialized" },
        { status: 503 },
      );
    }

    (global as any).agentControl.sendCommandToAgent(agentId, {
      command,
      payload,
    });

    // Log audit event
    await supabase.from("audit_logs").insert({
      action: "agent_command_sent",
      user_id: userId,
      organization_id: null,
      severity: "medium",
      resource_type: "agent",
      resource_id: String(agentId),
      payload: { agentId, command, payload },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API] Error sending agent command:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
