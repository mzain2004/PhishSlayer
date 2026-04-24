const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.phishslayer.tech https://accounts.phishslayer.tech https://challenges.cloudflare.com https://static.cloudflareinsights.com https://app.termly.io",
  "script-src-elem 'self' 'unsafe-inline' https://clerk.phishslayer.tech https://accounts.phishslayer.tech https://challenges.cloudflare.com https://static.cloudflareinsights.com https://app.termly.io",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://clerk.phishslayer.tech https://accounts.phishslayer.tech https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co https://api.clerk.com",
  "frame-src 'self' https://challenges.cloudflare.com https://accounts.phishslayer.tech",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: cspHeader,
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

module.exports = nextConfig;
