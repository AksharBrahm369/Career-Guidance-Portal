import { and, asc, eq, ilike, type SQL } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ImportItem } from "@/lib/admin/question-bank/item-schema";
import { toInsertRows } from "@/lib/admin/question-bank/seed-loader";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const url = new URL(req.url);
  const moduleParam = url.searchParams.get("module");
  const dimensionParam = url.searchParams.get("dimension");
  const activeParam = url.searchParams.get("active");
  const q = url.searchParams.get("q");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const conds: SQL[] = [];
  if (moduleParam === "aptitude" || moduleParam === "interests" || moduleParam === "work_style") {
    conds.push(eq(questionBank.module, moduleParam));
  }
  if (dimensionParam) {
    conds.push(eq(questionBank.dimension, dimensionParam));
  }
  if (activeParam === "true" || activeParam === "false") {
    conds.push(eq(questionBank.isActive, activeParam === "true"));
  }
  if (q) {
    conds.push(ilike(questionBank.questionText, `%${q}%`));
  }

  const rows = await db
    .select()
    .from(questionBank)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(questionBank.module), asc(questionBank.dimension))
    .limit(limit)
    .offset(offset);
  return Response.json({ items: rows });
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  let body;
  try {
    body = ImportItem.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  let row;
  try {
    row = toInsertRows([body])[0];
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  if (!row) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const [created] = await db.insert(questionBank).values(row).returning({ id: questionBank.id });
  await logAudit({
    adminId: admin.adminId,
    action: "create",
    entityType: "question_bank_item",
    entityId: created?.id,
    newValues: { module: body.module, dimension: body.dimension },
  });
  return Response.json({ id: created?.id }, { status: 201 });
}
