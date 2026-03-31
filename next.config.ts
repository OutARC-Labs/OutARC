import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '.prisma/client', 'pdf-parse', 'ioredis', 'bullmq'],
};

export default nextConfig;
