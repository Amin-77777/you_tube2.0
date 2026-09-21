import type { NextConfig } from "next";

const getBackendUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  if (url && !url.includes(".") && !url.includes("localhost")) {
    url = `${url}.onrender.com`;
  }
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
};

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  env: {
    BACKEND_URL: getBackendUrl(),
  },
  async rewrites() {
    const backendUrl = getBackendUrl();
    return [
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
