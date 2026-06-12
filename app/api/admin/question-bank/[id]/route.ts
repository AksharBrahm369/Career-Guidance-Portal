import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { questionBank, type NewQuestion } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Option = z.object({ id: z.string().min(1), text: z.string().min(1) });

const PatchBody = z
  .object({
    isActive: z.boolean(),
    dimension: z.string().min(1),
    questionText: z.string().min(1),
    options: z.array(Option).min(2),
    correctOptionId: z.string().min(1).nullable(),
    scoringMap: z.record(z.record(z.number())).nullable(),
    source: z.string().min(1),
    license: z.string().nullable(),
    version: z.number().int().positive(),
    poolGroup: z.string().nullable(),
    media: z
      .object({ stem: z.string().optional(), options: z.record(z.string()).optional() })
      .nullable(),
  })
  .partial();

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
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  const patch = body as Partial<NewQuestion>;
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "empty_patch" }, { status: 400 });
  }
  await db.update(questionBank).set(patch).where(eq(questionBank.id, id));
  await logAudit({
    adminId: admin.adminId,
    action: "update",
    entityType: "question_bank_item",
    entityId: id,
    newValues: body as Record<string, unknown>,
  });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;
  await db.delete(questionBank).where(eq(questionBank.id, id));
  await logAudit({
    adminId: admin.adminId,
    action: "delete",
    entityType: "question_bank_item",
    entityId: id,
  });
  return Response.json({ ok: true });
}
