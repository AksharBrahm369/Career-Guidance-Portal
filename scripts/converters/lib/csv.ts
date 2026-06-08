import { readFileSync } from "node:fs";

/**
 * Parse a CSV file into row objects keyed by the header row. Handles quoted
 * fields containing commas/newlines, escaped double-quotes (""), and CRLF.
 * Zero dependencies — enough for hand-authored item/manifest CSVs.
 */
export function parseCsv(path: string): Record<string, string>[] {
  const rows = parseRows(readFileSync(path, "utf8"));
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== "")) // drop blank lines
    .map((cells) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = (cells[i] ?? "").trim();
      });
      return obj;
    });
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
