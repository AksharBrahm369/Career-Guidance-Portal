import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Body = z.object({ reason: z.string().min(3).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  const [updated] = await db
    .update(courses)
    .set({
      status: "rejected",
      rejectionReason: body.reason,
      reviewedByAdminId: admin.adminId,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id))
    .returning();

  await logAudit({
    adminId: admin.adminId,
    action: "reject",
    entityType: "course",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: "rejected", reason: body.reason },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ course: updated });
}
