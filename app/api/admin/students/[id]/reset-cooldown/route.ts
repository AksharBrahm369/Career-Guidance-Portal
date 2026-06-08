import { and, eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { user } from "@/db/schema";

export const runtime = "nodejs";

/**
 * Clear the retake cooldown for a student: null out lastAssessmentAt and set
 * cooldownOverride so they can immediately start a fresh assessment attempt.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;

  const student = await db.query.user.findFirst({
    where: and(eq(user.id, id), eq(user.role, "student")),
  });
  if (!student) return Response.json({ error: "not_found" }, { status: 404 });

  await db
    .update(user)
    .set({ lastAssessmentAt: null, cooldownOverride: true })
    .where(eq(user.id, id));
  return Response.json({ ok: true });
}
