export type ScoringItem = {
  id: string;
  dimension: string;
  scoringMap?: Record<string, Record<string, number>> | null;
};
export type Riasec = Record<"R" | "I" | "A" | "S" | "E" | "C", number>;

const ZERO: Riasec = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

/**
 * Sum RIASEC contributions from the options a student chose.
 * Each item's `scoringMap[optionId]` is a partial RIASEC weight map.
 * Responses with no matching item (or option) are ignored.
 */
export function scoreInterests(responses: Record<string, string>, items: ScoringItem[]): Riasec {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: Riasec = { ...ZERO };
  for (const [qId, optId] of Object.entries(responses)) {
    const map = byId.get(qId)?.scoringMap?.[optId];
    if (!map) continue;
    for (const [dim, val] of Object.entries(map)) {
      if (dim in out) out[dim as keyof Riasec] += val;
    }
  }
  return out;
}
