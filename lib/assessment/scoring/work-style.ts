import type { ScoringItem } from "./interests";

/**
 * Same accumulation shape as interests, but trait keys are arbitrary
 * (work-style dimensions, e.g. "Analytical", "PeopleOriented") rather
 * than the fixed RIASEC set.
 */
export function scoreWorkStyle(
  responses: Record<string, string>,
  items: ScoringItem[],
): Record<string, number> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: Record<string, number> = {};
  for (const [qId, optId] of Object.entries(responses)) {
    const map = byId.get(qId)?.scoringMap?.[optId];
    if (!map) continue;
    for (const [trait, val] of Object.entries(map)) out[trait] = (out[trait] ?? 0) + val;
  }
  return out;
}
