import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWazuhApiToken } from "@/lib/wazuh-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WAZUH_MANAGER_URL = "https://167.172.85.62:55000";

const schema = z.object({
  agentId: z.string().min(1),
  filePath: z.string().min(1),
  caseId: z.string().optional(),
}).strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { agentId, filePath, caseId } = schema.parse(body);

    const token = await getWazuhApiToken();
    
    const response = await fetch(`${WAZUH_MANAGER_URL}/active-response?agents_list=${agentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        command: "!quarantine-file",
        alert: {
          agent: { id: agentId },
          data: { file: { path: filePath } }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Wazuh API call failed");
    }

    const data = await response.json();

    if (caseId) {
      const supabase = await createClient();
      await supabase.from("case_timeline").insert({
        case_id: caseId,
        action: "FILE_QUARANTINE_TRIGGERED",
        actor: userId,
        details: { agentId, filePath, result: data }
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[quarantine] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
