import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { checkTransition } from "@/lib/admin/course-transitions";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;

  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });
  const transition = checkTransition("publish", existing.status);
  if (!transition.ok) {
    return Response.json(transition.body, { status: 409 });
  }

  // Validate required fields are present.
  const missing: string[] = [];
  if (!existing.courseName) missing.push("courseName");
  if (!existing.description || existing.description.length < 150) missing.push("description (min 150 chars)");
  if (!existing.eligibilityCriteria) missing.push("eligibilityCriteria");
  if (!existing.tenureYears) missing.push("tenureYears");
  if (!existing.careerClusters?.length) missing.push("careerClusters");
  if (missing.length) {
    return Response.json({ error: "incomplete", missing }, { status: 422 });
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: "published",
      publishedAt: new Date(),
      reviewedByAdminId: admin.adminId,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id))
    .returning();

  await logAudit({
    adminId: admin.adminId,
    action: "publish",
    entityType: "course",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: "published" },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ course: updated });
}
