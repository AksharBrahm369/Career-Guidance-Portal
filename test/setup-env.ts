import { config } from "dotenv";

// Load env before any test module imports lib/env, which validates required
// vars at import time. Match scripts/load-env.ts so local workspaces can use
// either .env.local or a plain .env.
config({ path: ".env.local" });
config();
