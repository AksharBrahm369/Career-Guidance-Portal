import { scoreClusters } from "./cluster-match";
import { rankCourses } from "./course-rank";
import type {
  ClusterInput,
  CourseInput,
  CourseRecommendation,
  RecommendationResult,
  StudentProfile,
} from "./types";

const MAX_COURSES = 10;
const WEAK_TOP_FIT = 45; // best course below this = nothing fits well
const FLAT_FIT_SPREAD = 5; // top-vs-bottom course fit within this = undifferentiated

/**
 * Low-signal when the shortlist doesn't point anywhere clear: careless answers,
 * nothing eligible, a weak best match, or a near-tied shortlist. Shared by the
 * engine and the result screen so both agree on when to soften the #1.
 */
export function isLowSignal(
  recommendedCourses: CourseRecommendation[],
  confidence: StudentProfile["confidence"],
): boolean {
  const top = recommendedCourses[0]?.fitScore ?? 0;
  const bottom = recommendedCourses[recommendedCourses.length - 1]?.fitScore ?? 0;
  return (
    confidence === "low" ||
    recommendedCourses.length === 0 ||
    top < WEAK_TOP_FIT ||
    (recommendedCourses.length > 1 && top - bottom < FLAT_FIT_SPREAD)
  );
}

/**
 * Deterministic recommendation pipeline (§5.1): rank clusters, rank eligible
 * courses within them, and flag low-signal profiles so the UI can avoid a
 * falsely-confident #1. Low-signal is judged on the *course* results (a weak or
 * near-tied shortlist), not the cluster spread which is naturally compressed.
 * Pure — never calls an LLM.
 */
export function recommend(
  profile: StudentProfile,
  clusters: ClusterInput[],
  courses: CourseInput[],
): RecommendationResult {
  const clusterScores = scoreClusters(profile, clusters);
  const recommendedCourses = rankCourses(profile, clusterScores, courses).slice(0, MAX_COURSES);
  return {
    clusterScores,
    recommendedCourses,
    lowSignal: isLowSignal(recommendedCourses, profile.confidence),
  };
}

export type { RecommendationResult } from "./types";
