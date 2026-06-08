import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup-env.ts"],
    include: ["lib/**/*.test.ts"],
    exclude: ["node_modules", ".next", "drizzle"],
    pool: "forks",
  },
});
