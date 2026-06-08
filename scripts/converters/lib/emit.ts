import { writeFileSync } from "node:fs";
// Reuse the REAL seed schema so converter output can never drift from what the
// seeder accepts. item-schema has no `server-only` import, so a plain relative
// import works under tsx without the register stub.
import { ImportItem } from "../../../lib/admin/question-bank/item-schema";

/**
 * Validate every item against the canonical Zod schema and write a pretty JSON
 * array (matching the format the committed seed files use: 2-space indent + a
 * trailing newline). Throws on the first invalid item with the same error shape
 * as lib/admin/question-bank/seed-loader.ts:toInsertRows.
 */
export function validateAndWrite(items: unknown[], outPath: string): void {
  items.forEach((raw, i) => {
    const parsed = ImportItem.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Item ${i} invalid: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }
  });
  writeFileSync(outPath, JSON.stringify(items, null, 2) + "\n", "utf8");
  console.log(`✓ Wrote ${items.length} validated items -> ${outPath}`);
}
