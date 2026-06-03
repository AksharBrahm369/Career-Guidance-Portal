import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questionBank, type NewQuestion } from "@/db/schema";
import { ImportItem } from "./item-schema";

/** Pure: validate + map import items to question_bank insert rows. Throws on the first invalid item. */
export function toInsertRows(items: unknown[]): NewQuestion[] {
  return items.map((raw, i) => {
    const parsed = ImportItem.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Item ${i} invalid: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }
    const item = parsed.data;
    return {
      module: item.module,
      dimension: item.dimension,
      questionText: item.questionText,
      options: item.options,
      correctOptionId: item.module === "aptitude" ? item.correctOptionId : null,
      scoringMap: item.module === "aptitude" ? null : item.scoringMap,
      source: item.source,
      license: item.license ?? null,
      version: item.version ?? 1,
      poolGroup: item.poolGroup ?? null,
      media: item.media ?? null,
      isActive: true,
    } satisfies NewQuestion;
  });
}

/** Idempotent upsert: skips an item if a row with the same (source, dimension, questionText, version) exists. */
export async function seedItems(items: unknown[]): Promise<{ inserted: number; skipped: number }> {
  const rows = toInsertRows(items);
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const existing = await db
      .select({ id: questionBank.id })
      .from(questionBank)
      .where(
        and(
          eq(questionBank.source, row.source!),
          eq(questionBank.dimension, row.dimension),
          eq(questionBank.questionText, row.questionText),
          eq(questionBank.version, row.version!),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(questionBank).values(row);
    inserted++;
  }
  return { inserted, skipped };
}
