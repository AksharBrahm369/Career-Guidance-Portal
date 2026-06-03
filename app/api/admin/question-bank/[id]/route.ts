import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
const Body = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  await db.update(questionBank).set({ isActive: body.isActive }).where(eq(questionBank.id, id));
  await logAudit({ adminId: admin.adminId, action: "update", entityType: "question_bank_item", entityId: id, newValues: { isActive: body.isActive } });
  return Response.json({ ok: true });
}
