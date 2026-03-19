/** @type {import('next').NextConfig} */
const nextConfig = {
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
