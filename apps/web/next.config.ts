import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "../..",
  },
  transpilePackages: ["@pdf-saas/shared"],
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      {
        source: "/calculator-tools",
        destination: "/calculators",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
