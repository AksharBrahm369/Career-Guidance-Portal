import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";

export const ADMIN_STATUSES = [
  "published",
  "pending_review",
  "rejected",
  "archived",
] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export interface AdminCoursesFilters {
  status: AdminStatus;
  page?: number;
  perPage?: number;
}

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;

export interface AdminCoursesPage {
  rows: Array<typeof courses.$inferSelect>;
  page: number;
  perPage: number;
  total: number;
  pageCount: number;
  counts: Record<AdminStatus, number>;
}

export async function listAdminCourses(
  filters: AdminCoursesFilters,
): Promise<AdminCoursesPage> {
  const perPage = clamp(filters.perPage ?? DEFAULT_PER_PAGE, 1, MAX_PER_PAGE);
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * perPage;

  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.status, filters.status))
    .orderBy(desc(orderForStatus(filters.status)))
    .limit(perPage)
    .offset(offset);

  const countsRes = await db.execute<{
    published: number;
    pending_review: number;
    rejected: number;
    archived: number;
  }>(sql`
    select
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'pending_review')::int as pending_review,
      count(*) filter (where status = 'rejected')::int as rejected,
      count(*) filter (where status = 'archived')::int as archived
    from ${courses}
  `);
  const counts: Record<AdminStatus, number> = {
    published: countsRes.rows[0]?.published ?? 0,
    pending_review: countsRes.rows[0]?.pending_review ?? 0,
    rejected: countsRes.rows[0]?.rejected ?? 0,
    archived: countsRes.rows[0]?.archived ?? 0,
  };

  const total = counts[filters.status];

  return {
    rows,
    page,
    perPage,
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    counts,
  };
}

// Pick the column most relevant to the bucket so admins see "newest first" by the right axis.
function orderForStatus(status: AdminStatus) {
  switch (status) {
    case "published":
      return courses.publishedAt;
    case "pending_review":
      return courses.createdAt;
    case "rejected":
    case "archived":
      return courses.updatedAt;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
