import "dotenv/config";
import { readFile } from "node:fs/promises";
import { seedItems } from "../lib/admin/question-bank/seed-loader";

async function main() {
  const path = process.argv[2] ?? "db/seed/items/onet-interests.starter.json";
  const items = JSON.parse(await readFile(path, "utf8")) as unknown[];
  const { inserted, skipped } = await seedItems(items);
  console.log(`✓ Seeded ${path}: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
