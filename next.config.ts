import type { NextConfig } from "next";

const isExport = process.env.NEXT_EXPORT === 'true';

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/financial-system").trim();

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
