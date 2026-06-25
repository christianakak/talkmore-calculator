import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so the parent-dir lockfile isn't picked up.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
