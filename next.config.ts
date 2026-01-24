import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "imgur.com" },
      { hostname: "i.imgur.com" },
      { hostname: "pub-20da4aefbab14400b5ebb8424eaebaae.r2.dev" },
      { hostname: "media.licdn.com" },
      { hostname: "captcha-p.asprin.dev" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer-when-downgrade",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
