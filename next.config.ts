import type { NextConfig } from 'next'

// Validate environment variables at build time.
// import './src/env'

const nextConfig: NextConfig = {
  transpilePackages: ['three'],

  // React compiler does not work with tanstack table
  reactCompiler: false,

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Turbopack config
  turbopack: {
    // Turbopack has built-in optimized file watching - no watchOptions needed
  },

  /* config options here */
  images: {
    minimumCacheTTL: 2678400,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [96, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'rightful-cow-10.convex.cloud',
      },
      {
        protocol: 'https',
        hostname: 'cool-impala-80.convex.cloud',
      },
    ],
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
}

export default nextConfig
