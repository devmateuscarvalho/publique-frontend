import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const apiProxy = (
  process.env.API_PROXY_URL ||
  (process.env.VERCEL ? "http://85.239.240.59:8080" : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Quick Cloudflare tunnels (scripts/share-local.ps1) load this dev server from another host.
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${apiProxy}/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/register", destination: "/login", permanent: false },
      { source: "/create/manual", destination: "/posts", permanent: false },
      { source: "/create/manual/:postId", destination: "/posts/:postId", permanent: false },
      { source: "/create/automation", destination: "/posts/automate", permanent: false },
      { source: "/models", destination: "/create", permanent: false },
      { source: "/models/new", destination: "/create", permanent: false },
      { source: "/models/:modelId", destination: "/create", permanent: false },
      { source: "/create/models", destination: "/create", permanent: false },
      { source: "/create/models/new", destination: "/create", permanent: false },
      { source: "/create/models/:modelId", destination: "/create", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
