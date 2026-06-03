import type { NextConfig } from 'next'

// Validate environment variables at build time.
// import './src/env'

const nextConfig: NextConfig = {
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
}

export default nextConfig
