import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

async function findStudent(id: string) {
  return db.query.user.findFirst({
    where: and(eq(user.id, id), eq(user.role, "student")),
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;
  const student = await findStudent(id);
  if (!student) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ student });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;
  const student = await findStudent(id);
  if (!student) return Response.json({ error: "not_found" }, { status: 404 });

  // admin-plugin endpoint — REQUIRES the admin session, so forward the request headers.
  await auth.api.removeUser({ body: { userId: id }, headers: await headers() });

  await logAudit({
    adminId: admin.adminId,
    action: "delete",
    entityType: "student",
    entityId: id,
    oldValues: { name: student.name, phoneNumber: student.phoneNumber },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ ok: true });
}
