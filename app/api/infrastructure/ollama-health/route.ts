import { NextResponse } from "next/server";
import { z } from "zod";
import {
  OLLAMA_BASE_URL,
  ollamaHealth,
  ollamaModels,
} from "@/lib/ollama-client";
import { getAuthenticatedUser } from "@/lib/tenancy";
import { getServerRole } from "@/lib/rbac/serverRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ModelsResponseSchema = z.array(z.string());

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getServerRole();
  if (!role || !["admin", "manager", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const online = await ollamaHealth();

  let models: string[] = [];
  if (online) {
    try {
      const rawModels = await ollamaModels();
      const parsedModels = ModelsResponseSchema.safeParse(rawModels);
      models = parsedModels.success ? parsedModels.data : [];
    } catch {
      models = [];
    }
  }

  return NextResponse.json({
    online,
    models,
    base_url: OLLAMA_BASE_URL,
    fallback_active: !online,
  });
}
