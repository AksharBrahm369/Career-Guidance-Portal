import { headers } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/schema";

export const runtime = "nodejs";

const Body = z.object({ ban: z.boolean(), reason: z.string().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
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

  const hdrs = await headers();
  if (body.ban) {
    await auth.api.banUser({ body: { userId: id, banReason: body.reason }, headers: hdrs });
  } else {
    await auth.api.unbanUser({ body: { userId: id }, headers: hdrs });
  }
  return Response.json({ ok: true });
}
