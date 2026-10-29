import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg and bcryptjs run on the server only
  serverExternalPackages: ["pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
