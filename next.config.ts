import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // ✅ Ignore build errors/warnings during deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Future-proof optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'], // faster builds
  },
};

export default nextConfig;
