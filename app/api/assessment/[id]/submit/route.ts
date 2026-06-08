import { eq } from "drizzle-orm";
import { requireStudent, studentErrorResponse } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { assessments, user } from "@/db/schema";
import { getActiveItems } from "@/lib/assessment/items";
import { scoreAssessment, type AssessmentResponses } from "@/lib/assessment/scoring";
import { recommend } from "@/lib/recommendation";
import { getRecommendationInputs } from "@/lib/recommendation/catalogue";

export const runtime = "nodejs";

const REQUIRED_MODULES = ["interests", "work_style", "aptitude", "subjects", "marks"] as const;

/** Finalize an attempt: score the four lenses deterministically and persist the profile. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let student;
  try {
    student = await requireStudent();
  } catch (err) {
    return studentErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const { id } = await params;
  const attempt = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
  if (!attempt) return Response.json({ error: "not_found" }, { status: 404 });
  if (attempt.studentId !== student.studentId)
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (attempt.status !== "in_progress")
    return Response.json({ error: "already_completed" }, { status: 409 });

  const responses = (attempt.responses ?? {}) as AssessmentResponses & Record<string, unknown>;
  const missing = REQUIRED_MODULES.filter((m) => responses[m] == null);
  if (missing.length > 0)
    return Response.json({ error: "incomplete", missing }, { status: 400 });

  // Reads (pure scoring inputs) run in parallel; the two writes are committed atomically below.
  const [interests, workStyle, aptitude] = await Promise.all([
    getActiveItems("interests"),
    getActiveItems("work_style"),
    getActiveItems("aptitude"),
  ]);

  const profile = scoreAssessment(responses, {
    interests,
    work_style: workStyle,
    aptitude,
  });

  // Deterministic recommendation (gate -> cluster match -> ranked courses) over the
  // active clusters + published catalogue. No LLM in this path (platform invariant).
  const { clusters, courses } = await getRecommendationInputs();
  const rec = recommend(
    {
      interests: profile.interestData,
      workStyle: profile.workStyleScores,
      aptitude: profile.aptitudeScores,
      marks: profile.marks,
      subjectAffinities: profile.subjectAffinities,
      knownStream: profile.marks?.stream ?? null,
      confidence: profile.confidence,
    },
    clusters,
    courses,
  );

  const completedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(assessments)
      .set({
        status: "completed",
        completedAt,
        interestData: profile.interestData,
        workStyleScores: profile.workStyleScores,
        aptitudeScores: profile.aptitudeScores,
        marks: profile.marks,
        subjectAffinities: profile.subjectAffinities,
        knownStream: profile.marks?.stream ?? null,
        confidence: profile.confidence,
        clusterScores: rec.clusterScores,
        recommendedCourses: rec.recommendedCourses,
        careerClustersRanked: rec.clusterScores.map((c) => c.clusterKey),
      })
      .where(eq(assessments.id, id));
    await tx
      .update(user)
      .set({ lastAssessmentAt: completedAt })
      .where(eq(user.id, student.studentId));
  });

  return Response.json({ id, confidence: profile.confidence, lowSignal: rec.lowSignal });
}
