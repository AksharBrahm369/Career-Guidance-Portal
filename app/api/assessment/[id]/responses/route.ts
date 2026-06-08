import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireStudent, studentErrorResponse } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { assessments } from "@/db/schema";

export const runtime = "nodejs";

const SelfReportPatch = z.object({
  module: z.enum(["interests", "work_style", "aptitude"]),
  answers: z.record(z.string()),
});
const MarksPatch = z.object({
  module: z.literal("marks"),
  answers: z.object({
    board: z.string().min(1),
    stream: z.enum(["science", "commerce", "arts", "vocational"]),
    subjects: z.record(z.number()),
  }),
});
const SubjectsPatch = z.object({
  module: z.literal("subjects"),
  answers: z.record(z.number()), // subject label -> 1..5 liking
});
const ResponsesPatch = z.union([SelfReportPatch, SubjectsPatch, MarksPatch]);

/** Save one module's answers into the attempt's `responses` jsonb. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let student;
  try {
    student = await requireStudent();
  } catch (err) {
    return studentErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const { id } = await params;
  let body;
  try {
    body = ResponsesPatch.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const attempt = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
  if (!attempt) return Response.json({ error: "not_found" }, { status: 404 });
  if (attempt.studentId !== student.studentId)
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (attempt.status !== "in_progress")
    return Response.json({ error: "already_completed" }, { status: 409 });

  const merged = { ...(attempt.responses ?? {}), [body.module]: body.answers };
  await db.update(assessments).set({ responses: merged }).where(eq(assessments.id, id));
  return Response.json({ ok: true });
}
