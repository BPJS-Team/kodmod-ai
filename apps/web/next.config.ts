import type { NextConfig } from "next";

const apiOrigin = (process.env.API_ORIGIN ?? "http://127.0.0.1:8109").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return {
      fallback: [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }],
    };
  },
};

export default nextConfig;
