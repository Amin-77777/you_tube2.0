import type { NextConfig } from "next";

const getBackendUrl = (): string => {
  let url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:5000";

  if (
    url &&
    !url.includes(".") &&
    !url.includes("localhost") &&
    !url.startsWith("http")
  ) {
    if (!url.includes(":")) {
      url = `${url}:5000`;
    }
  }

  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `http://${url}`;
  }

  return url.replace(/\/$/, "");
};

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    BACKEND_URL: getBackendUrl(),
  },
  async rewrites() {
    const backendUrl = getBackendUrl();
    return [
      {
        source: "/user/:path*",
        destination: `${backendUrl}/user/:path*`,
      },
      {
        source: "/security/:path*",
        destination: `${backendUrl}/security/:path*`,
      },
      {
        source: "/video/:path*",
        destination: `${backendUrl}/video/:path*`,
      },
      {
        source: "/like/:path*",
        destination: `${backendUrl}/like/:path*`,
      },
      {
        source: "/watch/:path*",
        destination: `${backendUrl}/watch/:path*`,
      },
      {
        source: "/history/:path*",
        destination: `${backendUrl}/history/:path*`,
      },
      {
        source: "/comment/:path*",
        destination: `${backendUrl}/comment/:path*`,
      },
      {
        source: "/download/:path*",
        destination: `${backendUrl}/download/:path*`,
      },
      {
        source: "/subscription/:path*",
        destination: `${backendUrl}/subscription/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
      {
        source: "/api/turn-credentials",
        destination: `${backendUrl}/api/turn-credentials`,
      },
    ];
  },
};

export default nextConfig;
