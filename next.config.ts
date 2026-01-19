import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "imgur.com" },
      { hostname: "i.imgur.com" },
      { hostname: "pub-20da4aefbab14400b5ebb8424eaebaae.r2.dev" },
      { hostname: "media.licdn.com" },
    ],
  },
};

export default nextConfig;
