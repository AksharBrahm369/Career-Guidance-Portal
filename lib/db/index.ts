import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "@/db/schema";

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

const pool =
  globalForPool.__pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

if (env.NODE_ENV !== "production") {
  globalForPool.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export { schema };
