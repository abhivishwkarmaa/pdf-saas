import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "../..",
  },
  transpilePackages: ["@pdf-saas/shared"],
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
