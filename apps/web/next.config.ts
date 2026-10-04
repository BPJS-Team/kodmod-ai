import type { NextConfig } from "next";
import path from "node:path";

const apiOrigin = (process.env.API_ORIGIN ?? "http://127.0.0.1:8109").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return {
      fallback: [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }],
    };
  },
};

export default nextConfig;
