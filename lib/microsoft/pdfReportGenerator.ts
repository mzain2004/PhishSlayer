import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TimelineEvent } from "./timelineBuilder";
import type { Anomaly } from "./anomalyDetector";

export function generateIdentityReport(params: {
  timeline: TimelineEvent[];
  anomalies: Anomaly[];
  mttr: {
    avgMinutes: number;
    totalIncidents: number;
  };
  generatedAt: string;
  hoursAnalyzed: number;
}): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header bar
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Logo text
  doc.setTextColor(45, 212, 191);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PHISH-SLAYER", margin, 20);

  // Subtitle
  doc.setTextColor(139, 148, 158);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Identity Chain Analysis Report", margin, 30);

  // Report metadata
  doc.setTextColor(139, 148, 158);
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date(params.generatedAt).toLocaleString()}`,
    pageWidth - margin,
    20,
    {
      align: "right",
    },
  );
  doc.text(
    `Analysis Period: Last ${params.hoursAnalyzed} hours`,
    pageWidth - margin,
    28,
    { align: "right" },
  );

  let yPos = 55;

  // MTTR Summary section
  doc.setFillColor(22, 27, 34);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, "F");

  doc.setTextColor(230, 237, 243);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("MTTR SUMMARY", margin + 5, yPos + 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(45, 212, 191);
  doc.text(
    `Avg Resolution Time: ${params.mttr.avgMinutes} min`,
    margin + 5,
    yPos + 20,
  );
  doc.text(
    `Total Incidents: ${params.mttr.totalIncidents}`,
    margin + 80,
    yPos + 20,
  );

  yPos += 40;

  // Anomalies section
  if (params.anomalies.length > 0) {
    doc.setTextColor(230, 237, 243);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DETECTED ANOMALIES", margin, yPos);
    yPos += 8;

    const anomalyRows = params.anomalies
      .slice(0, 10)
      .map((a) => [
        a.severity.toUpperCase(),
        a.type.replace(/_/g, " "),
        a.description.slice(0, 60) + (a.description.length > 60 ? "..." : ""),
        new Date(a.timestamp).toLocaleTimeString(),
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Severity", "Type", "Description", "Time"]],
      body: anomalyRows,
      theme: "grid",
      headStyles: {
        fillColor: [13, 17, 23],
        textColor: [45, 212, 191],
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: [22, 27, 34],
        textColor: [230, 237, 243],
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 90 },
        3: { cellWidth: 28 },
      },
      margin: { left: margin, right: margin },
    });

    yPos =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 15;
  }

  // Timeline section
  doc.setTextColor(230, 237, 243);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTION TIMELINE", margin, yPos);
  yPos += 8;

  const timelineRows = params.timeline
    .slice(0, 30)
    .map((event) => [
      new Date(event.timestamp).toLocaleTimeString(),
      event.type.toUpperCase(),
      event.title.slice(0, 35) + (event.title.length > 35 ? "..." : ""),
      event.description.slice(0, 40) +
        (event.description.length > 40 ? "..." : ""),
      `${event.confidenceScore}%`,
      event.severity.toUpperCase(),
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Time", "Type", "Event", "Details", "Confidence", "Severity"]],
    body: timelineRows,
    theme: "grid",
    headStyles: {
      fillColor: [13, 17, 23],
      textColor: [45, 212, 191],
      fontSize: 8,
    },
    bodyStyles: {
      fillColor: [22, 27, 34],
      textColor: [230, 237, 243],
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 40 },
      3: { cellWidth: 50 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
    margin: { left: margin, right: margin },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(13, 17, 23);
    doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageWidth, 12, "F");
    doc.setTextColor(139, 148, 158);
    doc.setFontSize(7);
    doc.text(
      "CONFIDENTIAL - Phish-Slayer Identity Analysis",
      margin,
      doc.internal.pageSize.getHeight() - 4,
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 4,
      { align: "right" },
    );
  }

  return doc;
}
