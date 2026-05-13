"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error?.digest ?? "unknown");
  }, [error]);

  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 text-center"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "rgba(252, 165, 165, 0.1)" }}
        >
          <AlertTriangle className="h-6 w-6" style={{ color: "#FCA5A5" }} />
        </div>
        <h2
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Something went wrong
        </h2>
        <p
          className="mb-5 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          We ran into an unexpected error loading this page. The team has been
          notified.
        </p>
        {error?.digest ? (
          <p
            className="mb-4 font-mono text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--accent-500)",
            color: "white",
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
