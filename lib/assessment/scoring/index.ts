import { scoreInterests, type Riasec, type ScoringItem } from "./interests";
import { scoreWorkStyle } from "./work-style";
import { scoreAptitude, type AptitudeItem, type AptitudeResult } from "./aptitude";
import { processMarks, type MarksInput, type MarksProfile } from "./marks";
import { computeConfidence } from "./confidence";

export type AssessmentResponses = {
  interests?: Record<string, string>;
  work_style?: Record<string, string>;
  aptitude?: Record<string, string>;
  marks?: MarksInput;
};
export type ItemsByModule = {
  interests: ScoringItem[];
  work_style: ScoringItem[];
  aptitude: AptitudeItem[];
};
export type ScoredProfile = {
  interestData: Riasec;
  workStyleScores: Record<string, number>;
  aptitudeScores: AptitudeResult;
  marks: MarksProfile | null;
  confidence: "high" | "moderate" | "low";
};

/** Aggregate the four lenses into the stored "Brain Profile". Pure — never calls an LLM. */
export function scoreAssessment(r: AssessmentResponses, items: ItemsByModule): ScoredProfile {
  return {
    interestData: scoreInterests(r.interests ?? {}, items.interests),
    workStyleScores: scoreWorkStyle(r.work_style ?? {}, items.work_style),
    aptitudeScores: scoreAptitude(r.aptitude ?? {}, items.aptitude),
    marks: r.marks ? processMarks(r.marks) : null,
    confidence: computeConfidence(r),
  };
}

export type { Riasec, ScoringItem } from "./interests";
export type { AptitudeItem, AptitudeResult } from "./aptitude";
export type { MarksInput, MarksProfile } from "./marks";
