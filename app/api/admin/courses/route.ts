import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { CourseFetchResult } from "@/lib/ai/safe-fetch";
import { persistFetchedCourse } from "@/lib/admin/persist-fetched-course";
import { verifyUrls } from "@/lib/url-verify";

export const runtime = "nodejs";

const ALLOWED_STATUS = [
  "draft",
  "pending_review",
  "published",
  "archived",
  "rejected",
] as const;

const ListQuery = z.object({
  status: z.enum(ALLOWED_STATUS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const url = new URL(req.url);
  const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "invalid_query" }, { status: 400 });
  }
  const { status, limit, offset } = parsed.data;

  const where = status ? eq(courses.status, status) : undefined;
  const rows = await db
    .select()
    .from(courses)
    .where(where)
    .orderBy(desc(courses.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = (await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courses)
    .where(where)) as Array<{ count: number }>;
  const total = countRows[0]?.count ?? 0;

  return Response.json({ rows, total, limit, offset });
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = CourseFetchResult.parse(json);
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const warnings: string[] = [];
  if (parsed.sourceUrls.length > 0) {
    const verification = await verifyUrls(parsed.sourceUrls);
    for (const dead of verification.dead) {
      warnings.push(`Dropped source URL that returned 4xx/5xx: ${dead}`);
    }
    parsed.sourceUrls = [...verification.ok, ...verification.unknown];
  }

  const persisted = await persistFetchedCourse(parsed, {
    adminId: admin.adminId,
    source: "manual",
    ip,
    userAgent,
  });

  return Response.json(
    { courseId: persisted.courseId, slug: persisted.slug, warnings },
    { status: 201 },
  );
}
