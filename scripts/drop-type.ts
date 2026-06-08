import "./load-env";
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to DB, dropping type ai_safety_tag if exists...');
    await client.query('DROP TYPE IF EXISTS ai_safety_tag CASCADE;');
    console.log('Dropped type (if it existed).');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to drop type:', err);
    try {
      await client.end();
    } catch {}
    process.exit(1);
  }
}

main();
