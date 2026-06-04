import { scoreClusters } from "./cluster-match";
import { rankCourses } from "./course-rank";
import type { ClusterInput, CourseInput, RecommendationResult, StudentProfile } from "./types";

const LOW_SIGNAL_SPREAD = 0.08; // top-vs-bottom cluster spread below this = undifferentiated
const MAX_COURSES = 10;

/**
 * Deterministic recommendation pipeline (§5.1): rank clusters, rank eligible
 * courses within them, and flag low-signal profiles so the UI can avoid a
 * falsely-confident #1. Pure — never calls an LLM.
 */
export function recommend(
  profile: StudentProfile,
  clusters: ClusterInput[],
  courses: CourseInput[],
): RecommendationResult {
  const clusterScores = scoreClusters(profile, clusters);
  const recommendedCourses = rankCourses(profile, clusterScores, courses).slice(0, MAX_COURSES);

  const top = clusterScores[0]?.score ?? 0;
  const bottom = clusterScores[clusterScores.length - 1]?.score ?? 0;
  const lowSignal =
    profile.confidence === "low" ||
    clusterScores.length === 0 ||
    top - bottom < LOW_SIGNAL_SPREAD ||
    recommendedCourses.length === 0;

  return { clusterScores, recommendedCourses, lowSignal };
}

export type { RecommendationResult } from "./types";
