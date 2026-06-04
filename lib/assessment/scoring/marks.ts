export type MarksInput = { board: string; stream: string; subjects: Record<string, number> };
export type MarksProfile = MarksInput & { strengths: string[] };

/**
 * Keep marks raw (no cross-board normalization — the recommendation
 * engine respects the board) and rank subjects strongest-first so the
 * profile can surface intra-student strengths.
 */
export function processMarks(input: MarksInput): MarksProfile {
  const strengths = Object.entries(input.subjects)
    .sort(([, a], [, b]) => b - a)
    .map(([s]) => s);
  return { ...input, strengths };
}
