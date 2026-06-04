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

/** Cosine similarity restricted to the target's keys (0..1 for non-negative vectors). */
export function patternMatch(
  student: Record<string, number>,
  target: Record<string, number>,
): number {
  const keys = Object.keys(target);
  if (keys.length === 0) return 0;
  let dot = 0,
    sumT = 0,
    sumS = 0;
  for (const k of keys) {
    const s = student[k] ?? 0;
    const t = target[k];
    dot += s * t;
    sumT += t * t;
    sumS += s * s;
  }
  if (sumS === 0 || sumT === 0) return 0;
  return dot / (Math.sqrt(sumS) * Math.sqrt(sumT));
}
