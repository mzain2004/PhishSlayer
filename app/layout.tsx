import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { validateEnv } from "@/lib/config/validateEnv";

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
    <html lang="en" suppressHydrationWarning className="dark bg-[#0a0f1e]">
      <body className="bg-[#0a0f1e] text-white">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
