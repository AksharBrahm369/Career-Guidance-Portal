/** Client-safe question shape — answer keys (`correctOptionId`, `scoringMap`) are stripped server-side. */
export interface ClientItem {
  id: string;
  dimension: string;
  questionText: string;
  options: Array<{ id: string; text: string }>;
  media: { stem?: string; options?: Record<string, string> } | null;
}

export interface ClientItems {
  interests: ClientItem[];
  work_style: ClientItem[];
  aptitude: ClientItem[];
}

/** Self-report / aptitude answers: questionId -> optionId. */
export type ChoiceAnswers = Record<string, string>;

/** Subject-preference answers: subject label -> 1..5 liking. */
export type SubjectAnswers = Record<string, number>;

/** Captured subject affinities: subject label -> 0..1. */
export type SubjectAffinities = Record<string, number>;

export type Stream = "science" | "commerce" | "arts" | "vocational";

export interface MarksAnswers {
  board: string;
  stream: Stream;
  subjects: Record<string, number>;
}

/** Captured-profile prop shapes (mirror stored columns). */
export type Riasec = Record<string, number>;
export type WorkStyleScores = Record<string, number>;
export type AptitudeScores = Record<
  string,
  { raw: number; total: number; band: "strong" | "moderate" | "developing" }
>;
export interface Marks {
  board: string;
  stream: string;
  subjects: Record<string, number>;
  strengths: string[];
}
