import type { Question } from "@/db/schema";

export type ModuleValue = "interests" | "work_style" | "aptitude";

export const MODULES: ReadonlyArray<{
  value: ModuleValue;
  label: string;
  description: string;
}> = [
  {
    value: "interests",
    label: "Interests",
    description: "RIASEC self-report items scored on a 1–5 Likert scale.",
  },
  {
    value: "work_style",
    label: "Work Style",
    description: "Working-preference self-report items scored on a 1–5 Likert scale.",
  },
  {
    value: "aptitude",
    label: "Aptitude",
    description: "Ability items with one correct option per question.",
  },
];

export function moduleLabel(module: string): string {
  return MODULES.find((m) => m.value === module)?.label ?? module;
}

/** Derive a human-facing item "type" from its shape. */
export type QuestionType = "Likert" | "Aptitude" | "Figural";

export function questionType(q: Question): QuestionType {
  if (q.media?.stem || (q.media?.options && Object.keys(q.media.options).length > 0)) {
    return "Figural";
  }
  if (q.correctOptionId) return "Aptitude";
  return "Likert";
}
