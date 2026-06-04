import type { StudentProfile } from "./types";

/** Scale a weight map so its largest value becomes 1 (within-student, §5.2). */
export function normalizeByMax(m: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(m));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) out[k] = max === 0 ? v : v / max;
  return out;
}

/** Aptitude sub-abilities as 0..1 proportions (raw/total). */
export function normalizeAptitude(a: StudentProfile["aptitude"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, { raw, total }] of Object.entries(a)) out[k] = total > 0 ? raw / total : 0;
  return out;
}

/** Mean subject percentage on a 0..1 scale; 0 when no marks. */
export function marksAggregate(marks: StudentProfile["marks"]): number {
  const vals = Object.values(marks?.subjects ?? {});
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length / 100;
}

/**
 * Magnitude-aware fit over the dimensions the target emphasizes: a weighted
 * average of the student's normalized strength on those dims (weights = the
 * target's emphasis). Unlike cosine, this rewards *how strong* the student is
 * on what the cluster wants — a weak-but-proportional profile scores low, so
 * clusters differentiate honestly. Range 0..1 (student inputs are normalized).
 */
export function patternMatch(
  student: Record<string, number>,
  target: Record<string, number>,
): number {
  let num = 0,
    den = 0;
  for (const [k, t] of Object.entries(target)) {
    num += (student[k] ?? 0) * t;
    den += t;
  }
  return den === 0 ? 0 : num / den;
}
