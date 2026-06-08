import { parseCsv } from "./lib/csv";
import { buildAptitudeItem, OPTION_LETTERS, type Option } from "./lib/aptitude";
import { validateAndWrite } from "./lib/emit";

/**
 * Convert a hand-authored text-aptitude CSV into seed JSON.
 * Columns: dimension, questionText, optA..optF, correctOption, source, license?, poolGroup?
 * Empty optX cells are skipped (supports 4–6 options).
 */
export function convertTextCsv(csvPath: string, outPath: string): void {
  const rows = parseCsv(csvPath);
  if (rows.length === 0) throw new Error(`No data rows in ${csvPath}`);

  const items = rows.map((row, idx) => {
    const n = idx + 1;
    const dimension = (row.dimension ?? "").trim();
    if (!dimension) throw new Error(`Row ${n}: dimension is required`);
    const questionText = (row.questionText ?? "").trim();
    if (!questionText) throw new Error(`Row ${n}: questionText is required`);

    const options: Option[] = [];
    for (const letter of OPTION_LETTERS) {
      const text = (row[`opt${letter.toUpperCase()}`] ?? "").trim();
      if (text !== "") options.push({ id: letter, text });
    }
    if (options.length < 2) throw new Error(`Row ${n}: needs at least 2 non-empty options`);

    const correct = (row.correctOption ?? "").trim().toLowerCase();
    if (!options.some((o) => o.id === correct)) {
      throw new Error(
        `Row ${n}: correctOption "${row.correctOption}" is not one of the filled options (${options
          .map((o) => o.id)
          .join(",")})`,
      );
    }

    return buildAptitudeItem({
      dimension,
      questionText,
      options,
      correctOptionId: correct,
      source: (row.source ?? "").trim() || "AUTHORED",
      license: (row.license ?? "").trim() || undefined,
      poolGroup: (row.poolGroup ?? "").trim() || undefined,
    });
  });

  validateAndWrite(items, outPath);
}
