export type AptitudeItem = { id: string; dimension: string; correctOptionId?: string | null };
export type AptitudeResult = Record<
  string,
  { raw: number; total: number; band: "strong" | "moderate" | "developing" }
>;

function band(pct: number): "strong" | "moderate" | "developing" {
  if (pct >= 0.7) return "strong";
  if (pct >= 0.4) return "moderate";
  return "developing";
}

/**
 * Tally correct answers per ability dimension and assign a band.
 * `total` counts every item in the dimension (answered or not); an
 * unanswered or wrong item simply doesn't increment `raw`.
 */
export function scoreAptitude(
  responses: Record<string, string>,
  items: AptitudeItem[],
): AptitudeResult {
  const acc: Record<string, { raw: number; total: number }> = {};
  for (const item of items) {
    const a = (acc[item.dimension] ??= { raw: 0, total: 0 });
    a.total += 1;
    if (item.correctOptionId && responses[item.id] === item.correctOptionId) a.raw += 1;
  }
  const out: AptitudeResult = {};
  for (const [dim, { raw, total }] of Object.entries(acc)) {
    out[dim] = { raw, total, band: band(total === 0 ? 0 : raw / total) };
  }
  return out;
}
