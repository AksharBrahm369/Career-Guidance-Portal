export type Option = { id: string; text: string };
export type AptitudeMedia = { stem?: string; options?: Record<string, string> };

export interface AptitudeItemInput {
  dimension: string;
  questionText: string;
  options: Option[];
  correctOptionId: string;
  source: string;
  license?: string;
  media?: AptitudeMedia;
  poolGroup?: string;
}

/**
 * Build one aptitude question_bank import object in the same key order the
 * existing seed files use. Validation (incl. correctOptionId ∈ options) is done
 * downstream by validateAndWrite against the real Zod schema.
 */
export function buildAptitudeItem(input: AptitudeItemInput): Record<string, unknown> {
  const item: Record<string, unknown> = {
    module: "aptitude",
    dimension: input.dimension,
    questionText: input.questionText,
    options: input.options,
    correctOptionId: input.correctOptionId,
  };
  if (input.media) item.media = input.media;
  item.source = input.source;
  if (input.license) item.license = input.license;
  if (input.poolGroup) item.poolGroup = input.poolGroup;
  return item;
}

/** Option-letter columns supported by the text + figural manifests (4–6 options). */
export const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f"] as const;
