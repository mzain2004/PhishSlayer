const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.termly.io https://public.profitwell.com",
  "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://app.termly.io https://public.profitwell.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://app.termly.io",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://app.termly.io",
  "img-src * data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.polar.sh https://*.supabase.co https://*.supabase.in https://app.termly.io https://us.consent.api.termly.io wss://*.supabase.co wss://phishslayer.tech https://www.virustotal.com https://public.profitwell.com https://*.profitwell.com",
  "frame-src https://polar.sh https://*.polar.sh https://app.termly.io",
  "worker-src blob:",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
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
