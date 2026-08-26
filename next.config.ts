import type { NextConfig } from "next";
import path from "path";

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
    // Avoid bundling resend's webhook-verification (svix, ~3MB unbundled) and
    // inbound-email-parsing (postal-mime) dependencies — this app only ever
    // sends mail via resend.emails.send(), see src/stubs/svix.ts and
    // src/stubs/postal-mime.ts.
    config.resolve.alias["svix"] = path.resolve(__dirname, "src/stubs/svix.ts");
    config.resolve.alias["postal-mime"] = path.resolve(
      __dirname,
      "src/stubs/postal-mime.ts"
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
