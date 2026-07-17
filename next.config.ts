import type { NextConfig } from "next";

// URL_BASE_PATH must be set at build time (via Docker --build-arg) so that
// Next.js can bake the correct prefix into /_next/static asset URLs.
// At runtime, the proxy (src/proxy.ts) strips this prefix from incoming
// requests so internal Next.js routes remain at their canonical paths.
const BASE_PATH = (() => {
  const raw = process.env.URL_BASE_PATH ?? "";
  const stripped = raw.replace(/\/$/, "");
  return stripped && !stripped.startsWith("/") ? `/${stripped}` : stripped;
})();

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Many modules use the `use cache` directive which requires `cacheComponents`.
  // Enable it to allow cache directives while ensuring route files do not
  // export conflicting `dynamic` configurations.
  cacheComponents: true,
  output: "standalone",
  assetPrefix: BASE_PATH || undefined,
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content-Security-Policy is set at runtime in proxy.ts (middleware)
          // so it can read CSP_FRAME_ANCESTORS from Docker runtime env vars.
          // next.config.ts headers() runs AFTER middleware in Next.js and would
          // overwrite the runtime CSP, so it is intentionally omitted here.
        ],
      },
    ];
  },
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
