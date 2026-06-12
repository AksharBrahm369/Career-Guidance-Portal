import { headers } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Body = z.object({ newPassword: z.string().min(8) });

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

  const student = await db.query.user.findFirst({
    where: and(eq(user.id, id), eq(user.role, "student")),
  });
  if (!student) return Response.json({ error: "not_found" }, { status: 404 });

  await auth.api.setUserPassword({
    body: { userId: id, newPassword: body.newPassword },
    headers: await headers(),
  });

  // NEVER log password material — record only that a reset happened.
  await logAudit({
    adminId: admin.adminId,
    action: "reset_password",
    entityType: "student",
    entityId: id,
    newValues: { passwordReset: true },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ ok: true });
}
