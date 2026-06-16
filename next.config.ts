import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['crawlee', 'puppeteer', 'playwright', 'bullmq', 'ioredis'],
};

export default nextConfig;
