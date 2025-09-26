import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',
  images: {
    unoptimized: false,
  },
  // Ensure proper build optimization
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
