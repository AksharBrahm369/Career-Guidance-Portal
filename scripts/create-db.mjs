// One-off: create the local Postgres database if it doesn't exist.
// Connects to the default `postgres` database using the same credentials,
// then issues CREATE DATABASE. Safe to re-run (skips if already present).
import pg from "pg";

const HOST = process.env.PGHOST ?? "localhost";
const PORT = Number(process.env.PGPORT ?? 5432);
const USER = process.env.PGUSER ?? "postgres";
const PASSWORD = process.env.PGPASSWORD ?? "postgres";
const DB_NAME = process.env.PGDATABASE ?? "hp_career";

const client = new pg.Client({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  database: "postgres",
});

try {
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
  if (rowCount > 0) {
    console.log(`Database "${DB_NAME}" already exists — nothing to do.`);
  } else {
    // CREATE DATABASE can't be parameterized; DB_NAME is a trusted constant here.
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`Created database "${DB_NAME}".`);
  }
  console.log(`Connection string: postgresql://${USER}:***@${HOST}:${PORT}/${DB_NAME}`);
} catch (err) {
  console.error("Failed to create database:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
