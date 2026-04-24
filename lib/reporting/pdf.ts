import { SupabaseClient } from "@supabase/supabase-js";
import PDFDocument from "pdfkit";
import { MetricsEngine } from "./metrics";
import { SOCDashboardMetrics, ComplianceMapping } from "../soc/types";

export class PDFReportGenerator {
  private supabase: SupabaseClient;
  private metricsEngine: MetricsEngine;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.metricsEngine = new MetricsEngine(supabase);
  }

  public async generateExecutiveReport(org_id: string, period_days: number = 30): Promise<Buffer> {
    const metrics = await this.metricsEngine.getDashboardMetrics(org_id, period_days * 24);
    const frameworks = ["nist_csf", "iso_27001", "soc2"];
    const compliance = await Promise.all(frameworks.map(f => this.metricsEngine.getComplianceMapping(org_id, f)));
    
    const { data: tenant } = await this.supabase.from("tenants").select("name").eq("id", org_id).single();
    const orgName = tenant?.name || "Organization";

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // ── Page 1: Cover ──
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0a0a0a");
      doc.fillColor("#ffffff").fontSize(36).text("SECURITY OPERATIONS REPORT", 50, 200, { align: "center" });
      doc.fontSize(24).text(orgName, { align: "center" });
      doc.fontSize(14).fillColor("#8B949E").text(`Period: ${new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toLocaleDateString()} to ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.moveDown(4);
      doc.fillColor("#22d3ee").fontSize(18).text("PhishSlayer Autonomous SOC", { align: "center" });

      // ── Page 2: Executive Summary ──
      doc.addPage().fillColor("#000000");
      doc.fontSize(20).text("EXECUTIVE SUMMARY", 50, 50);
      doc.moveDown();

      const scoreColor = metrics.risk_score < 34 ? "#10b981" : (metrics.risk_score < 67 ? "#f59e0b" : "#ef4444");
      doc.fontSize(14).fillColor("#000000").text("Security Risk Score:");
      doc.fontSize(48).fillColor(scoreColor).text(metrics.risk_score.toString(), { underline: true });
      doc.fontSize(12).fillColor("#000000").text(`Trend: ${metrics.trend_vs_previous_period.toUpperCase()}`);
      doc.moveDown(2);

      doc.fontSize(16).text("Key Metrics");
      const gridY = doc.y;
      doc.fontSize(12);
      doc.text(`Total Alerts: ${metrics.total_alerts}`, 50, gridY + 20);
      doc.text(`MTTD: ${metrics.mttd_minutes} min`, 50, gridY + 40);
      doc.text(`Open Cases: ${metrics.active_cases}`, 250, gridY + 20);
      doc.text(`MTTR: ${metrics.mttr_minutes} min`, 250, gridY + 40);
      doc.moveDown(4);

      doc.fontSize(16).text("Key Findings");
      doc.fontSize(12);
      if (metrics.mttd_minutes > 30) doc.text(`• Detection speed requires improvement — avg ${metrics.mttd_minutes} min`);
      if (metrics.critical_cases > 0) doc.text(`• ${metrics.critical_cases} critical cases require immediate attention`);
      if (metrics.sla_breaches > 0) doc.text(`• ${metrics.sla_breaches} SLA breaches recorded this period`);
      if (metrics.critical_cases === 0 && metrics.sla_breaches === 0) doc.text("• No critical incidents detected this period");

      // ── Page 3: Alert Analysis ──
      doc.addPage();
      doc.fontSize(20).text("ALERT ANALYSIS", 50, 50);
      doc.moveDown();
      doc.fontSize(14).text("Hourly Alert Distribution (24h Window)");
      doc.moveDown();

      // Simple bar chart
      const chartBaseX = 50;
      const chartBaseY = 250;
      const barWidth = 15;
      metrics.alert_volume_by_hour.forEach((val, i) => {
          const barHeight = Math.min(val * 10, 150);
          doc.rect(chartBaseX + (i * 20), chartBaseY - barHeight, barWidth, barHeight).fill("#7c6af7");
      });
      doc.moveTo(50, chartBaseY).lineTo(530, chartBaseY).stroke();
      doc.fillColor("#000000").fontSize(8).text("00:00", 50, chartBaseY + 5).text("12:00", 280, chartBaseY + 5).text("23:59", 510, chartBaseY + 5);

      doc.moveDown(4);
      doc.fontSize(14).text("Top Threat Sources");
      metrics.top_source_ips.forEach((ip, i) => doc.fontSize(12).text(`${i+1}. ${ip}`));

      // ── Page 4: Compliance ──
      doc.addPage();
      doc.fontSize(20).text("COMPLIANCE POSTURE", 50, 50);
      doc.moveDown();

      compliance.forEach(mapping => {
          doc.fontSize(16).text(mapping.framework.toUpperCase().replace("_", " "));
          const barColor = mapping.coverage_percentage > 70 ? "#10b981" : (mapping.coverage_percentage > 40 ? "#f59e0b" : "#ef4444");
          doc.rect(50, doc.y + 5, 400, 20).stroke();
          doc.rect(50, doc.y + 5, (mapping.coverage_percentage / 100) * 400, 20).fill(barColor);
          doc.moveDown(2);
      });

      // ── Page 5: Recommendations ──
      doc.addPage();
      doc.fontSize(20).text("RECOMMENDATIONS", 50, 50);
      doc.moveDown();
      doc.fontSize(12);
      if (metrics.mttd_minutes > 60) doc.text("1. Investigate alert enrichment pipeline latency to reduce MTTD.");
      if (metrics.mttr_minutes > 240) doc.text("2. Review and optimize incident response playbooks for faster resolution.");
      if (metrics.sla_breaches > 0) doc.text("3. Adjust SLA thresholds or increase security analyst capacity.");
      if (metrics.risk_score > 66) doc.text("4. Immediate audit of high-risk entity behavior profiles recommended.");
      doc.text("5. Continue monitoring for unauthorized activity via UEBA sensors.");

      doc.moveDown(10);
      doc.fontSize(10).fillColor("#8B949E").text("Confidential — Generated by PhishSlayer Autonomous SOC Platform", { align: "center" });

      doc.end();
    });
  }
}
