const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.paddle.com https://app.termly.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src * data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.paddle.com; frame-src https://buy.paddle.com https://*.paddle.com;"
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'phishslayer.tech',
        'www.phishslayer.tech',
        '20.235.98.184',
        'localhost:3000',
      ]
    }
  }
};

module.exports = nextConfig;
