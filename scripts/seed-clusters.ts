import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { careerClusters } from "../db/schema";
import { STARTER_CLUSTERS } from "../db/seed/clusters";

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const c of STARTER_CLUSTERS) {
    const existing = await db.query.careerClusters.findFirst({ where: eq(careerClusters.key, c.key) });
    if (existing) { skipped++; continue; }
    await db.insert(careerClusters).values({
      key: c.key, name: c.name, description: c.description ?? null,
      targetProfile: c.targetProfile, lensWeights: c.lensWeights,
    });
    inserted++;
  }
  console.log(`✓ Clusters: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => { console.error("✗ Cluster seed failed:", err); process.exit(1); });
