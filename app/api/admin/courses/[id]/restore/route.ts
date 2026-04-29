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
  if (existing.status !== "archived") {
    return Response.json(
      { error: "invalid_transition", from: existing.status, to: "published" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? new Date(),
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
    newValues: { status: "published", restored: true },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ course: updated });
}
