import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role verification (must be manager or higher)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "manager" &&
        profile.role !== "admin" &&
        profile.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { agentId, command, payload } = await request.json();

    if (!agentId || !command) {
      return NextResponse.json(
        { error: "Missing agentId or command" },
        { status: 400 },
      );
    }

    const validCommands = [
      "block_ip",
      "kill_process",
      "quarantine_file",
      "ping",
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
      user_id: user.id,
      details: { agentId, command, payload },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API] Error sending agent command:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
