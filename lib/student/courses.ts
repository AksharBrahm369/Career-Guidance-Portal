import "server-only";
import { and, arrayOverlaps, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { courseInstitutes, courses, institutes } from "@/db/schema";

export type StreamFilter = "science" | "commerce" | "arts" | "vocational";
export type AiSafetyFilter = "ai_safe" | "ai_augmented" | "ai_risk";

export interface CatalogueFilters {
  q?: string;
  stream?: StreamFilter;
  aiSafety?: AiSafetyFilter;
  cluster?: string;
  page?: number;
  perPage?: number;
}

const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 48;

export async function listPublishedCourses(filters: CatalogueFilters) {
  const perPage = clamp(filters.perPage ?? DEFAULT_PER_PAGE, 1, MAX_PER_PAGE);
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * perPage;

  const conditions: SQL[] = [eq(courses.status, "published")];
  if (filters.stream) conditions.push(eq(courses.stream, filters.stream));
  if (filters.aiSafety) conditions.push(eq(courses.aiSafetyTag, filters.aiSafety));
  if (filters.q) {
    const pattern = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${courses.courseName}) like ${pattern} or lower(${courses.description}) like ${pattern})`,
    );
  }
  if (filters.cluster) {
    conditions.push(arrayOverlaps(courses.careerClusters, [filters.cluster]));
  }
  const where = and(...conditions);

  const rows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      courseName: courses.courseName,
      stream: courses.stream,
      aiSafetyTag: courses.aiSafetyTag,
      tenureYears: courses.tenureYears,
      description: courses.description,
      careerClusters: courses.careerClusters,
      publishedAt: courses.publishedAt,
    })
    .from(courses)
    .where(where)
    .orderBy(desc(courses.publishedAt))
    .limit(perPage)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  // counts (per-course institute totals) and totalRes (overall page count) are
  // independent of each other — run them concurrently to save a DB round-trip.
  const [counts, totalRes] = await Promise.all([
    ids.length
      ? db
          .select({
            courseId: courseInstitutes.courseId,
            count: sql<number>`count(*)::int`,
          })
          .from(courseInstitutes)
          .where(inArray(courseInstitutes.courseId, ids))
          .groupBy(courseInstitutes.courseId)
      : Promise.resolve([]),
    db.execute<{ total: number }>(
      sql`select count(*)::int as total from ${courses} where ${where}`,
    ),
  ]);
  const countMap = new Map(counts.map((c) => [c.courseId, c.count]));
  const total = totalRes.rows[0]?.total ?? 0;

  return {
    rows: rows.map((r) => ({
      ...r,
      instituteCount: countMap.get(r.id) ?? 0,
      shortDescription: truncate(r.description, 180),
    })),
    page,
    perPage,
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getPublishedCourseRowBySlug(slug: string) {
  return db.query.courses.findFirst({
    where: and(eq(courses.slug, slug), eq(courses.status, "published")),
  });
}

export async function getInstitutesForCourse(courseId: string) {
  const links = await db
    .select({ instituteId: courseInstitutes.instituteId })
    .from(courseInstitutes)
    .where(eq(courseInstitutes.courseId, courseId));
  const instituteIds = links.map((l) => l.instituteId);

  return instituteIds.length
    ? db
        .select()
        .from(institutes)
        .where(inArray(institutes.id, instituteIds))
        .orderBy(institutes.name)
    : [];
}

export async function getPublishedCourseBySlug(slug: string) {
  const course = await getPublishedCourseRowBySlug(slug);
  if (!course) return null;
  const linkedInstitutes = await getInstitutesForCourse(course.id);
  return { course, institutes: linkedInstitutes };
}

export async function getRelatedPublishedCourses(
  excludeId: string,
  clusters: string[],
  limit = 4,
) {
  if (clusters.length === 0) return [];
  const matching = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      courseName: courses.courseName,
      stream: courses.stream,
      aiSafetyTag: courses.aiSafetyTag,
    })
    .from(courses)
    .where(
      and(
        eq(courses.status, "published"),
        arrayOverlaps(courses.careerClusters, clusters),
        ne(courses.id, excludeId),
      ),
    )
    .limit(limit);
  return matching;
}

export async function getCourseById(id: string) {
  return db.query.courses.findFirst({ where: eq(courses.id, id) });
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len).replace(/\s+\S*$/, "") + "…";
}
