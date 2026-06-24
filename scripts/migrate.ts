import "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { env } from "../lib/env";
import { createPoolConfig } from "../lib/db/pool-config";

async function main() {
  const pool = new Pool(createPoolConfig(env.DATABASE_URL, 1));
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ Migrations applied");
}

main().catch((err) => {
  console.error("✗ Migration failed:", err);
  process.exit(1);
});
