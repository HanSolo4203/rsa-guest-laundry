import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',
  images: {
    unoptimized: false,
  },
  // Minimal configuration to avoid CSS parsing issues
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;