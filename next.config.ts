import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const standaloneOutput = process.env.NEXT_STANDALONE === "true";

const nextConfig: NextConfig = {
  ...(standaloneOutput ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: appDir,
  reactStrictMode: true,
  typedRoutes: true,
  // Better Auth pulls in adapter internals for several runtimes. Keep these
  // server-only packages external so Webpack does not bundle unused Kysely
  // dialect files that import incompatible named exports.
  serverExternalPackages: [
    "better-auth",
    "@better-auth/core",
    "@better-auth/drizzle-adapter",
    "@better-auth/kysely-adapter",
    "kysely",
  ],
  // Transform `import { Icon } from "lucide-react"` into direct per-icon imports
  // at build time so the ~1,500-module barrel is never loaded. Cuts cold-start
  // and dev/HMR cost across every page/component that uses an icon.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
