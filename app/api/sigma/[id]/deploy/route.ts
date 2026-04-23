import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { SigmaGenerator } from "@/lib/soc/sigma/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: rule, error } = await supabase
      .from("sigma_rules")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const generator = new SigmaGenerator(supabase);
    const wazuh_rule_id = await generator.deployToWazuh(rule);

    if (!wazuh_rule_id) {
      return NextResponse.json({ error: "Deployment failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, wazuh_rule_id });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
