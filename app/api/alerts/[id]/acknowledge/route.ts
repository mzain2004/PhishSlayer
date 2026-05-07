import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    // Check if already acknowledged
    const { data: alert, error: fetchError } = await supabase
      .from("alerts")
      .select("acknowledged_by")
      .eq("id", id)
      .single();

    if (fetchError || !alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    if (alert.acknowledged_by && alert.acknowledged_by !== userId) {
      return NextResponse.json({ error: "Alert already acknowledged by another analyst" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("alerts")
      .update({
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
        status: "in_progress"
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
