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

/** Capability signal for a specific course: mean of relevant subject marks (0..1), else overall mean. */
function subjectSignal(student: StudentProfile, course: CourseInput): number {
  const subs = student.marks?.subjects ?? {};
  const rel = course.requiredSubjects.map((s) => subs[s]).filter((v): v is number => v != null);
  if (rel.length === 0) {
    const all = Object.values(subs);
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length / 100 : 0;
  }
  return rel.reduce((a, b) => a + b, 0) / rel.length / 100;
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

    const subSig = subjectSignal(student, course);
    let fit01 = 0.7 * best.score + 0.3 * subSig;
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
