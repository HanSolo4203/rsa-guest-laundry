import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force dynamic rendering - no static generation
  output: 'standalone',
  images: {
    unoptimized: false,
  },
  // Disable static optimization
  trailingSlash: false,
  // Force all pages to be dynamic
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;