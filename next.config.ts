import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
  // Better Auth (and its nested kysely) must be resolved by Node at runtime, not
  // bundled by webpack — bundling breaks named imports like kysely's
  // DEFAULT_MIGRATION_TABLE.
  serverExternalPackages: ["better-auth"],
  // Transform `import { Icon } from "lucide-react"` into direct per-icon imports
  // at build time so the ~1,500-module barrel is never loaded. Cuts cold-start
  // and dev/HMR cost across every page/component that uses an icon.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
