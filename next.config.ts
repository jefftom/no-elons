import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // Native modules stay outside the bundle.
  serverExternalPackages: ["sharp", "@node-rs/argon2"],
  experimental: {
    serverActions: {
      // Composer uploads up to 4 photos at 10 MB each.
      bodySizeLimit: "45mb",
    },
  },
  poweredByHeader: false,
  async rewrites() {
    // Pretty profile URLs: /@jane -> /u/jane (folders starting with "@"
    // are parallel-route slots in the App Router, so we rewrite instead).
    return [
      { source: "/@:username", destination: "/u/:username" },
      { source: "/@:username/:path*", destination: "/u/:username/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
