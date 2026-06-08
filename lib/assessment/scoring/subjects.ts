/**
 * Subject-preference scorer: normalize 1–5 "liking" ratings into within-student
 * 0..1 affinities (the student's strongest-rated subject becomes 1). Keyed by
 * subject label so the recommendation engine can match a course's
 * requiredSubjects to what the student enjoys. Ratings of 0 / empty are dropped.
 */
export function scoreSubjects(responses: Record<string, number>): Record<string, number> {
  const entries = Object.entries(responses).filter(([, r]) => r > 0);
  const max = Math.max(0, ...entries.map(([, r]) => r));
  const out: Record<string, number> = {};
  for (const [subject, r] of entries) out[subject] = max === 0 ? 0 : r / max;
  return out;
}
