import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',
  images: {
    unoptimized: false,
  },
  // Disable any CSS optimizations that might use lightningcss
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Explicitly disable any CSS optimizations
    cssChunking: 'strict',
  },
  // Webpack configuration to avoid lightningcss
  webpack: (config, { isServer }) => {
    // Ensure no CSS optimizations that might use lightningcss
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };
    return config;
  },
};

export default nextConfig;