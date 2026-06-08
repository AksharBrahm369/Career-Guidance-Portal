import { evaluateEligibility } from "./eligibility";
import type {
  ClusterScore,
  CourseInput,
  CourseRecommendation,
  StudentProfile,
} from "./types";

const RIASEC_LABEL: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

// How the course-specific subject signal splits between can-do (marks) and
// likes (subject affinity). Tunable. 0.5 = weight both equally.
const SUBJECT_MARKS_WEIGHT = 0.5;

/** Mean of a 0..1 map over a course's required subjects, falling back to the overall mean. */
function meanOverRequired(
  map: Record<string, number>,
  requiredSubjects: string[],
  scale: number,
): number {
  const rel = requiredSubjects.map((s) => map[s]).filter((v): v is number => v != null);
  const pool = rel.length > 0 ? rel : Object.values(map);
  if (pool.length === 0) return 0;
  return pool.reduce((a, b) => a + b, 0) / pool.length / scale;
}

/** Can-do signal: mean of relevant subject marks (0..1). */
function subjectMarksSignal(student: StudentProfile, course: CourseInput): number {
  return meanOverRequired(student.marks?.subjects ?? {}, course.requiredSubjects, 100);
}

/** Likes signal: mean of relevant subject affinities (already 0..1). */
function subjectAffinitySignal(student: StudentProfile, course: CourseInput): number {
  return meanOverRequired(student.subjectAffinities ?? {}, course.requiredSubjects, 1);
}

function buildReasons(
  student: StudentProfile,
  course: CourseInput,
  cluster: ClusterScore,
  crossStream: boolean,
): string[] {
  const reasons: string[] = [];
  const topInterest = Object.entries(student.interests).sort(([, a], [, b]) => b - a)[0]?.[0];
  if (topInterest) reasons.push(`Matches your ${RIASEC_LABEL[topInterest] ?? topInterest} interest`);
  const strongApt = Object.entries(student.aptitude).find(([, v]) => v.band === "strong")?.[0];
  if (strongApt) reasons.push(`Backed by strong ${strongApt} aptitude`);
  const relSub = course.requiredSubjects.find((s) => (student.marks?.subjects ?? {})[s] != null);
  if (relSub) reasons.push(`Your ${relSub} marks (${student.marks!.subjects[relSub]}%) fit`);
  const likedSub = course.requiredSubjects.find((s) => ((student.subjectAffinities ?? {})[s] ?? 0) >= 0.8);
  if (likedSub) reasons.push(`You enjoy ${likedSub}`);
  reasons.push(`Strong fit for the ${cluster.name} cluster`);
  if (crossStream) reasons.push(`Note: cross-stream from ${student.knownStream} — check the entrance route`);
  return reasons;
}

/**
 * Rank eligible courses (§5.5). Fit blends the best-matching ranked cluster's
 * score (context) with a course-specific subject-marks signal; cross-stream
 * applies a penalty. Tie-break: fitScore desc, then in-stream before cross-stream.
 */
export function rankCourses(
  student: StudentProfile,
  clusterScores: ClusterScore[],
  courses: CourseInput[],
): CourseRecommendation[] {
  const scoreByKey = new Map(clusterScores.map((c) => [c.clusterKey, c]));
  const out: CourseRecommendation[] = [];

  for (const course of courses) {
    const elig = evaluateEligibility(student, course);
    if (!elig.eligible) continue;
    // Best matching ranked cluster for this course.
    let best: ClusterScore | undefined;
    for (const key of course.careerClusters) {
      const cs = scoreByKey.get(key);
      if (cs && (!best || cs.score > best.score)) best = cs;
    }
    if (!best) continue; // no recommendable cluster context

    // Course-specific signal blends can-do (marks) and likes (subject affinity).
    const courseSignal =
      SUBJECT_MARKS_WEIGHT * subjectMarksSignal(student, course) +
      (1 - SUBJECT_MARKS_WEIGHT) * subjectAffinitySignal(student, course);
    let fit01 = 0.7 * best.score + 0.3 * courseSignal;
    if (elig.crossStream) fit01 *= 0.85;
    out.push({
      courseId: course.id,
      slug: course.slug,
      courseName: course.courseName,
      clusterKey: best.clusterKey,
      fitScore: Math.round(Math.max(0, Math.min(1, fit01)) * 100),
      crossStream: elig.crossStream,
      reasons: buildReasons(student, course, best, elig.crossStream),
    });
  }

  return out.sort((a, b) => b.fitScore - a.fitScore || Number(a.crossStream) - Number(b.crossStream));
}
