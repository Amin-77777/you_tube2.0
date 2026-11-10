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
        source: "/user/:path*",
        destination: `${normalizedBackend}/user/:path*`,
      },
      {
        source: "/security/:path*",
        destination: `${normalizedBackend}/security/:path*`,
      },
      {
        source: "/video/:path*",
        destination: `${normalizedBackend}/video/:path*`,
      },
      {
        source: "/like/:path*",
        destination: `${normalizedBackend}/like/:path*`,
      },
      {
        source: "/watch/:path*",
        destination: `${normalizedBackend}/watch/:path*`,
      },
      {
        source: "/history/:path*",
        destination: `${normalizedBackend}/history/:path*`,
      },
      {
        source: "/comment/:path*",
        destination: `${normalizedBackend}/comment/:path*`,
      },
      {
        source: "/download/:path*",
        destination: `${normalizedBackend}/download/:path*`,
      },
      {
        source: "/subscription/:path*",
        destination: `${normalizedBackend}/subscription/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${normalizedBackend}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
