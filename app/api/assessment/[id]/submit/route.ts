import { eq } from "drizzle-orm";
import { requireStudent, studentErrorResponse } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { assessments, students } from "@/db/schema";
import { getActiveItems } from "@/lib/assessment/items";
import { scoreAssessment, type AssessmentResponses } from "@/lib/assessment/scoring";

export const runtime = "nodejs";

const REQUIRED_MODULES = ["interests", "work_style", "aptitude", "marks"] as const;

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
        knownStream: profile.marks?.stream ?? null,
        confidence: profile.confidence,
      })
      .where(eq(assessments.id, id));
    await tx
      .update(students)
      .set({ lastAssessmentAt: completedAt })
      .where(eq(students.id, student.studentId));
  });

  return Response.json({ id, confidence: profile.confidence });
}
