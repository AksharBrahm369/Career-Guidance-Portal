import "server-only";
import type { Assessment } from "@/db/schema";
import { isLowSignal, recommend } from "@/lib/recommendation";
import { getRecommendationInputs } from "@/lib/recommendation/catalogue";
import type { ClusterScore, CourseRecommendation, StudentProfile } from "@/lib/recommendation/types";

type Confidence = StudentProfile["confidence"];

export type AssessmentRecommendationView = {
  confidence: Confidence;
  clusterScores: ClusterScore[];
  recommendedCourses: CourseRecommendation[];
  lowSignal: boolean;
  recomputed: boolean;
};

function parseConfidence(value: string | null | undefined): Confidence {
  return value === "high" || value === "moderate" || value === "low" ? value : null;
}

function profileFromAssessment(
  assessment: Assessment,
  confidence: Confidence,
): StudentProfile | null {
  if (!assessment.interestData || !assessment.workStyleScores || !assessment.aptitudeScores) {
    return null;
  }

  return {
    interests: assessment.interestData,
    workStyle: assessment.workStyleScores,
    aptitude: assessment.aptitudeScores,
    marks: assessment.marks ?? null,
    subjectAffinities: assessment.subjectAffinities ?? {},
    knownStream: assessment.knownStream ?? assessment.marks?.stream ?? null,
    confidence,
  };
}

function shouldUseStoredRecommendations(recommendedCourses: CourseRecommendation[]): boolean {
  if (recommendedCourses.length === 0) return false;
  const uniqueFitScores = new Set(recommendedCourses.map((course) => course.fitScore));
  return uniqueFitScores.size > 1;
}

export async function getAssessmentRecommendationView(
  assessment: Assessment,
): Promise<AssessmentRecommendationView> {
  const confidence = parseConfidence(assessment.confidence);
  const storedCourses = assessment.recommendedCourses ?? [];
  const storedClusters = assessment.clusterScores ?? [];

  if (shouldUseStoredRecommendations(storedCourses)) {
    return {
      confidence,
      clusterScores: storedClusters,
      recommendedCourses: storedCourses,
      lowSignal: isLowSignal(storedCourses, confidence),
      recomputed: false,
    };
  }

  const profile = profileFromAssessment(assessment, confidence);
  if (!profile) {
    return {
      confidence,
      clusterScores: storedClusters,
      recommendedCourses: storedCourses,
      lowSignal: isLowSignal(storedCourses, confidence),
      recomputed: false,
    };
  }

  const { clusters, courses } = await getRecommendationInputs();
  const result = recommend(profile, clusters, courses);

  return {
    confidence,
    clusterScores: result.clusterScores,
    recommendedCourses: result.recommendedCourses,
    lowSignal: result.lowSignal,
    recomputed: true,
  };
}
