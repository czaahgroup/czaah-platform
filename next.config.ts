import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Avoid bundling @react-email/render's prettier dependency (~250KB) —
    // it's never actually used, see src/stubs/react-email-render.ts.
    config.resolve.alias["@react-email/render"] = path.resolve(
      __dirname,
      "src/stubs/react-email-render.ts"
    );
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=self, microphone=self, geolocation=()' },
        ],
      },
    ]
  },
};

export default nextConfig;
