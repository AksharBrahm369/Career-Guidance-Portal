import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { createPoolConfig } from "@/lib/db/pool-config";
import * as schema from "@/db/schema";

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

const pool =
  globalForPool.__pgPool ??
  new Pool(createPoolConfig(env.DATABASE_URL, 10));

if (env.NODE_ENV !== "production") {
  globalForPool.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export { schema };
