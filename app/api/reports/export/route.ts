import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { apiError, API_CODES } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const exportSchema = z.object({
  reportType: z.enum(["executive", "technical", "compliance"]),
  alertId: z.string().uuid().optional(),
  period: z.number().int().min(1).max(365).default(30),
  framework: z.enum(["nist", "iso27001", "soc2"]).default("nist"),
});

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(API_CODES.VALIDATION_ERROR, "Invalid JSON", 400);
  }

  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(API_CODES.VALIDATION_ERROR, "Invalid input", 400);
  }

  const { reportType, alertId, period, framework } = parsed.data;

  // Call Python API to generate report content
  const apiUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";
  let reportContent: string;
  try {
    const resp = await fetch(`${apiUrl}/api/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        report_type: reportType,
        alert_id: alertId,
        period,
        framework,
      }),
    });
    if (!resp.ok) {
      reportContent = `Report generation service unavailable (${resp.status}). Please retry.`;
    } else {
      const data = await resp.json();
      reportContent = data.content ?? "No content returned.";
    }
  } catch {
    reportContent = `Report content unavailable — agent service offline.`;
  }

  // Build PDF with pdfkit
  const PDFDocument = (await import("pdfkit")).default;
  const chunks: Buffer[] = [];

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);

    const title =
      reportType === "executive"
        ? "Executive Security Summary"
        : reportType === "technical"
        ? "Technical Incident Report"
        : `Compliance Report (${framework.toUpperCase()})`;

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PhishSlayer SOC Report", { align: "center" });

    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica").text(title, { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Generated: ${new Date().toUTCString()}  |  Org: ${orgId}`, {
        align: "center",
      });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc
      .fontSize(11)
      .fillColor("black")
      .font("Helvetica")
      .text(reportContent, { lineGap: 4 });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);
  const filename = `phishslayer-${reportType}-report-${Date.now()}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
