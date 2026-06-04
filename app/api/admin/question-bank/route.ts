import { and, eq, type SQL } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const url = new URL(req.url);
  const moduleParam = url.searchParams.get("module");
  const conds: SQL[] = [];
  if (moduleParam === "aptitude" || moduleParam === "interests" || moduleParam === "work_style") {
    conds.push(eq(questionBank.module, moduleParam));
  }
  const rows = await db
    .select()
    .from(questionBank)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(questionBank.module, questionBank.dimension)
    .limit(500);
  return Response.json({ items: rows });
}
