import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
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
  if (existing.status !== "rejected") {
    return Response.json(
      { error: "invalid_transition", from: existing.status, to: "pending_review" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: "pending_review",
      rejectionReason: null,
      reviewedByAdminId: null,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id))
    .returning();

  await logAudit({
    adminId: admin.adminId,
    action: "update",
    entityType: "course",
    entityId: id,
    oldValues: { status: existing.status, rejectionReason: existing.rejectionReason },
    newValues: { status: "pending_review", reopened: true },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ course: updated });
}
