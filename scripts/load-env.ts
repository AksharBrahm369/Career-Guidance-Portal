// Load env for tsx scripts. The repo uses `.env.local` (no `.env`), and
// `lib/env.ts` validates `process.env` at import time — so this MUST be the
// first import in every script, before anything that pulls in `lib/env`.
import { config } from "dotenv";

config({ path: ".env.local" });
config(); // also load a plain `.env` if one exists (no-op otherwise)
