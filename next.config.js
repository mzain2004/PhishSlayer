const { withSentryConfig } = require("@sentry/nextjs");

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.phishslayer.tech https://accounts.phishslayer.tech https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.clerk.com",
  "script-src-elem 'self' 'unsafe-inline' https://clerk.phishslayer.tech https://accounts.phishslayer.tech https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.clerk.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  // Sentry ingest endpoints alongside existing Clerk / Supabase domains
  "connect-src 'self' https://clerk.phishslayer.tech https://accounts.phishslayer.tech https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co https://api.clerk.com https://*.clerk.com https://*.sentry.io https://sentry.io",
  "frame-src 'self' https://challenges.cloudflare.com https://accounts.phishslayer.tech https://*.clerk.com",
  // Allow same-origin iframes and the production domain explicitly
  "frame-ancestors 'self' https://phishslayer.tech",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // SAMEORIGIN allows the app to be embedded within the same origin
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  // CORS — restrict to production origin in production, allow localhost in dev
  {
    key: "Access-Control-Allow-Origin",
    value: process.env.NODE_ENV === "production"
      ? "https://phishslayer.tech"
      : "http://localhost:3000",
  },
  {
    key: "Access-Control-Allow-Methods",
    value: "GET, POST, PUT, DELETE, OPTIONS",
  },
  {
    key: "Access-Control-Allow-Headers",
    value: "Content-Type, Authorization, x-request-id",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["ssh2"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@supabase/supabase-js",
    ],
    serverActions: {
      allowedOrigins: [
        "phishslayer.tech",
        "www.phishslayer.tech",
        "40.123.224.93",
        "localhost:3000",
      ],
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

// withSentryConfig wraps Next.js config to:
//  - Upload source maps to Sentry on build (requires SENTRY_AUTH_TOKEN)
//  - Inject Sentry SDK into server/edge/client bundles automatically
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print Sentry logs in CI
  silent: !process.env.CI,

  // Upload source maps only when SENTRY_AUTH_TOKEN is present
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },

  widenClientFileUpload: true,
});
