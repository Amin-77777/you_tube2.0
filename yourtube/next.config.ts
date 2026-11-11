import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://youtube-backend-dc7c.onrender.com";

const normalizedBackend = (
  BACKEND_URL.startsWith("http://") || BACKEND_URL.startsWith("https://")
    ? BACKEND_URL
    : `https://${BACKEND_URL}`
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: normalizedBackend,
    BACKEND_URL: normalizedBackend,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${normalizedBackend}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
