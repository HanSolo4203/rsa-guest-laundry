import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
  },
  // Minimal configuration to avoid CSS parsing issues
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Turbopack configuration
  turbopack: {
    // Set the root directory to avoid lockfile warnings
    root: process.cwd(),
  },
};

export default nextConfig;