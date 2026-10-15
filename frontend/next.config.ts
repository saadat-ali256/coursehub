import type { NextConfig } from "next";

const apiServer = process.env.API_SERVER_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.18.182"],
  experimental: {
    proxyClientMaxBodySize: "2gb",
    proxyTimeout: 30 * 60 * 1000,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiServer}/api/:path*` },
      { source: "/uploads/:path*", destination: `${apiServer}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
