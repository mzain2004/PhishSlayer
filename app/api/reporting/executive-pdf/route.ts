import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { PDFReportGenerator } from "@/lib/reporting/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period_days = parseInt(searchParams.get("period_days") || "30");
  const org_id = searchParams.get("org_id") || "default";

  try {
    const supabase = await createClient();
    const generator = new PDFReportGenerator(supabase);
    const pdfBuffer = await generator.generateExecutiveReport(org_id, period_days);

    const date = new Date().toISOString().split('T')[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=security-report-${date}.pdf`
      }
    });
  } catch (error) {
    console.error("[reporting] PDF generation failure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
