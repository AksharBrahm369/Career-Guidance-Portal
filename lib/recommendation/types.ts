export type RiasecKey = "R" | "I" | "A" | "S" | "E" | "C";

/** The stored Brain Profile, shaped for the deterministic engine. */
export type StudentProfile = {
  interests: Record<string, number>; // interestData (raw RIASEC sums)
  workStyle: Record<string, number>; // workStyleScores (raw trait sums)
  aptitude: Record<
    string,
    { raw: number; total: number; band: "strong" | "moderate" | "developing" }
  >;
  marks: {
    board: string;
    stream: string;
    subjects: Record<string, number>;
    strengths: string[];
  } | null;
  knownStream: string | null;
  confidence: "high" | "moderate" | "low" | null;
};

export type ClusterInput = {
  key: string;
  name: string;
  targetProfile: {
    interests: Record<string, number>;
    aptitude: Record<string, number>;
    workStyle: Record<string, number>;
  };
  lensWeights: { interests: number; aptitude: number; marks: number; workStyle: number };
};

export type CourseInput = {
  id: string;
  slug: string;
  courseName: string;
  stream: string;
  careerClusters: string[]; // cluster keys
  requiredSubjects: string[];
  eligibility: {
    minAggregate?: number;
    minBySubject?: Record<string, number>;
    requiredStreamSubjects?: string[];
    entranceExams?: string[];
  } | null;
};

/** Outputs persisted on the assessments row. */
export type ClusterScore = {
  clusterKey: string;
  name: string;
  score: number;
  breakdown: { interests: number; aptitude: number; workStyle: number; marks: number };
};

export type CourseRecommendation = {
  courseId: string;
  slug: string;
  courseName: string;
  clusterKey: string;
  fitScore: number;
  crossStream: boolean;
  reasons: string[];
};

export type RecommendationResult = {
  clusterScores: ClusterScore[];
  recommendedCourses: CourseRecommendation[];
  lowSignal: boolean;
};
