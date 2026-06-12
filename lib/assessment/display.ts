import type { getActiveItems } from "@/lib/assessment/items";

export function dimensionMaxScores(
  rows: Awaited<ReturnType<typeof getActiveItems>>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.dimension] = (counts[row.dimension] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).map(([dimension, count]) => [dimension, count * 5]),
  );
}
