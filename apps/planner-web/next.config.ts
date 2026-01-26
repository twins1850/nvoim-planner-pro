import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during builds for now
  typescript: {
    ignoreBuildErrors: false, // Keep type checking enabled
  },
  // Skip static page generation to avoid prerender errors
  output: 'standalone',
};

export default nextConfig;
