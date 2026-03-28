import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "sonner";
import { validateEnv } from "@/lib/config/validateEnv";
import ConsentBanner from "@/components/ConsentBanner";

// Validate environment variables at startup (server-side only)
validateEnv();

export const metadata: Metadata = {
  title: "Phish Slayer",
  description: "Advanced phishing threat detection and response platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="dark selection:bg-teal-500/30"
    >
      <head>
        <Script
          src="https://app.termly.io/resource-blocker/fa073781-55e5-45b6-a6ef-29405a9723b7?autoBlock=on"
          strategy="lazyOnload"
        />
      </head>
      <body className="bg-[#0D1117] text-[#E6EDF3] antialiased min-h-screen">
        {children}
        <Toaster richColors position="top-right" />
        <ConsentBanner />
      </body>
    </html>
  );
}
