import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Prevent Next from picking the parent folder as workspace root (causes hangs on Windows)
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: `${process.env.API_URL ?? "http://127.0.0.1:3001"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
