import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Evidence uploads (policy docs, model cards, test results) run
      // through a server action — default 1mb body limit is too small.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
