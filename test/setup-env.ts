import { config } from "dotenv";

// Local env lives only in .env.local (no .env). Load it before any test module
// imports lib/env, which validates required vars at import time.
config({ path: ".env.local" });
