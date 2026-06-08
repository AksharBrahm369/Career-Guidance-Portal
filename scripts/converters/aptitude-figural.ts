import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "./lib/csv";
import { buildAptitudeItem, OPTION_LETTERS, type Option } from "./lib/aptitude";
import { validateAndWrite } from "./lib/emit";

/**
 * Convert a figural manifest CSV + an images folder into seed JSON.
 * Columns: itemId, dimension, correctOptionId, questionText?, stem, optA..optF (image filenames),
 *          license?, poolGroup?
 * Emits media.stem + media.options URLs under /aptitude/<source>/. Asserts every
 * referenced image file exists and itemIds are unique. Cropping/hosting of the
 * images themselves is a manual step (copy them into public/aptitude/<source>/).
 */
export function convertFigural(
  manifestPath: string,
  imagesDir: string,
  source: string,
  outPath: string,
): void {
  const rows = parseCsv(manifestPath);
  if (rows.length === 0) throw new Error(`No rows in ${manifestPath}`);

  const urlBase = `/aptitude/${source}`;
  const seen = new Set<string>();

  const items = rows.map((row, idx) => {
    const n = idx + 1;
    const itemId = (row.itemId ?? "").trim();
    if (!itemId) throw new Error(`Row ${n}: itemId is required`);
    if (seen.has(itemId)) throw new Error(`Duplicate itemId "${itemId}"`);
    seen.add(itemId);

    const stem = (row.stem ?? "").trim();
    if (!stem) throw new Error(`Row ${n} (${itemId}): stem image is required`);
    requireFile(imagesDir, stem, itemId);

    const options: Option[] = [];
    const optionMedia: Record<string, string> = {};
    for (const letter of OPTION_LETTERS) {
      const file = (row[`opt${letter.toUpperCase()}`] ?? "").trim();
      if (file === "") continue;
      requireFile(imagesDir, file, itemId);
      options.push({ id: letter, text: `Option ${letter.toUpperCase()}` });
      optionMedia[letter] = `${urlBase}/${file}`;
    }
    if (options.length < 2) throw new Error(`Row ${n} (${itemId}): needs at least 2 option images`);

    const correct = (row.correctOptionId ?? "").trim().toLowerCase();
    if (!options.some((o) => o.id === correct)) {
      throw new Error(`Row ${n} (${itemId}): correctOptionId "${row.correctOptionId}" not among options`);
    }

    return buildAptitudeItem({
      dimension: (row.dimension ?? "").trim() || "spatial",
      questionText: (row.questionText ?? "").trim() || "Which option completes the pattern?",
      options,
      correctOptionId: correct,
      media: { stem: `${urlBase}/${stem}`, options: optionMedia },
      source,
      license: (row.license ?? "").trim() || undefined,
      poolGroup: (row.poolGroup ?? "").trim() || undefined,
    });
  });

  validateAndWrite(items, outPath);
}

function requireFile(dir: string, file: string, itemId: string): void {
  if (!existsSync(join(dir, file))) {
    throw new Error(`Item ${itemId}: image file not found: ${join(dir, file)}`);
  }
}
