import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保 Server Actions 在生产环境正确工作
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // 允许外部图片和资源
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
