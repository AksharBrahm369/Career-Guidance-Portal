import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { user } from "@/db/schema";

export const runtime = "nodejs";

/**
 * List student users (role='student'). Supports a free-text `?q=` over name or
 * phone number (case-insensitive), plus `?limit`/`?offset` pagination. Returns
 * the page of rows and the unfiltered-by-page total for the same filter.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const filters = [eq(user.role, "student")];
  if (q) {
    const like = `%${q}%`;
    filters.push(or(ilike(user.name, like), ilike(user.phoneNumber, like))!);
  }
  const where = and(...filters);

  const [students, totalRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        grade: user.grade,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        lastAssessmentAt: user.lastAssessmentAt,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(user).where(where),
  ]);

  return Response.json({ students, total: totalRows[0]?.count ?? 0 });
}
