import type { Metadata } from "next";
import DocsCardGrid from "@/components/docs/DocsCardGrid";
import { CONTACT_EMAIL, SUPPORT_EMAIL } from "@/lib/email";

export const metadata: Metadata = {
  title: "Documentation — PhishSlayer",
  description:
    "PhishSlayer agentic SOC platform documentation: alerts, threat hunting, IOC management, API reference, and more.",
};

export default function DocsIndex() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          marginBottom: 12,
        }}
      >
        PhishSlayer Documentation
      </h1>
      <p
        style={{
          fontSize: 16,
          color: "var(--text-secondary)",
          lineHeight: "1.7",
          marginBottom: 40,
          maxWidth: 560,
        }}
      >
        PhishSlayer is an agentic Security Operations Center platform that
        automates detection, triage, investigation, and response across your
        entire attack surface — email, endpoints, identity, and network.
      </p>

      <DocsCardGrid />

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: 10,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Need help?
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          for platform support, or{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            {CONTACT_EMAIL}
          </a>{" "}
          for sales and enterprise inquiries.
        </p>
      </div>
    </>
  );
}
