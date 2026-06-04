import { and, eq } from "drizzle-orm";
import { requireStudent, studentErrorResponse } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { assessments } from "@/db/schema";

export const runtime = "nodejs";

/** Resume the student's in-progress attempt, or create a fresh one. */
export async function POST() {
  let student;
  try {
    student = await requireStudent();
  } catch (err) {
    return studentErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const existing = await db.query.assessments.findFirst({
    where: and(
      eq(assessments.studentId, student.studentId),
      eq(assessments.status, "in_progress"),
    ),
  });
  if (existing) return Response.json({ id: existing.id, resumed: true });

  const [created] = await db
    .insert(assessments)
    .values({ studentId: student.studentId })
    .returning({ id: assessments.id });
  if (!created) return Response.json({ error: "internal" }, { status: 500 });
  return Response.json({ id: created.id, resumed: false }, { status: 201 });
}
