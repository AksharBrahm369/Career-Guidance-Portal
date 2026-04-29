import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { env } from "./lib/env";

config(); // Load .env file

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
