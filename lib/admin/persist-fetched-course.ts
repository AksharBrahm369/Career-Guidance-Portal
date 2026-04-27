import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  courseInstitutes,
  courses,
  institutes,
  type NewCourse,
  type NewInstitute,
} from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { CourseFetchResult } from "@/lib/ai/safe-fetch";

export interface PersistContext {
  adminId: string;
  source: "ai_fetch" | "manual";
  ip?: string | null;
  userAgent?: string | null;
}

export interface PersistResult {
  courseId: string;
  slug: string;
  instituteIds: string[];
}

/**
 * Persists a fetched (or manually-built) course into pending_review state and links institutes.
 * Pure write — caller is responsible for auth.
 */
export async function persistFetchedCourse(
  data: CourseFetchResult,
  ctx: PersistContext,
): Promise<PersistResult> {
  const allCourseSlugs = await db.select({ slug: courses.slug }).from(courses);
  const slugSet = new Set(allCourseSlugs.map((r) => r.slug));
  const slug = uniqueSlug(data.courseName, slugSet);

  const newCourse: NewCourse = {
    slug,
    courseName: data.courseName,
    courseCode: data.courseCode ?? null,
    stream: data.stream,
    careerClusters: data.careerClusters,
    aiSafetyTag: data.aiSafetyTag,
    aiSafetyTagAi: ctx.source === "ai_fetch" ? data.aiSafetyTag : null,
    description: data.description,
    tenureYears: String(data.tenureYears),
    eligibilityCriteria: data.eligibilityCriteria,
    entranceExams: data.entranceExams,
    feesMinInr: data.feesMinInr != null ? String(data.feesMinInr) : null,
    feesMaxInr: data.feesMaxInr != null ? String(data.feesMaxInr) : null,
    sourceUrls: data.sourceUrls,
    status: "pending_review",
    source: ctx.source,
    createdByAdminId: ctx.adminId,
    fetchedAt: ctx.source === "ai_fetch" ? new Date() : null,
  };

  const [insertedCourse] = await db.insert(courses).values(newCourse).returning({
    id: courses.id,
    slug: courses.slug,
  });
  if (!insertedCourse) throw new Error("Failed to insert course");

  // Upsert institutes by slug + city.
  const instituteIds: string[] = [];
  for (const inst of data.institutes) {
    const baseSlug = slugify(`${inst.name} ${inst.city}`);
    const existing = baseSlug
      ? await db.query.institutes.findFirst({ where: eq(institutes.slug, baseSlug) })
      : undefined;

    let instituteId: string;
    if (existing) {
      instituteId = existing.id;
    } else {
      const newInst: NewInstitute = {
        slug: baseSlug,
        name: inst.name,
        instituteType: inst.instituteType,
        rankingTag: "unranked",
        city: inst.city,
        state: inst.state,
        annualFeesInr: inst.annualFeesInr != null ? String(inst.annualFeesInr) : null,
        websiteUrl: inst.websiteUrl ?? null,
        status: "pending_review",
      };
      const [created] = await db.insert(institutes).values(newInst).returning({ id: institutes.id });
      if (!created) throw new Error("Failed to insert institute");
      instituteId = created.id;
    }
    instituteIds.push(instituteId);
  }

  if (instituteIds.length > 0) {
    await db.insert(courseInstitutes).values(
      instituteIds.map((instituteId) => ({
        courseId: insertedCourse.id,
        instituteId,
      })),
    );
  }

  await logAudit({
    adminId: ctx.adminId,
    action: ctx.source === "ai_fetch" ? "ai_fetch" : "create",
    entityType: "course",
    entityId: insertedCourse.id,
    newValues: { courseName: data.courseName, slug, instituteCount: instituteIds.length },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { courseId: insertedCourse.id, slug: insertedCourse.slug, instituteIds };
}

export async function getExistingCourseNames(): Promise<string[]> {
  const rows = await db
    .select({ name: courses.courseName, status: courses.status })
    .from(courses)
    .where(inArray(courses.status, ["pending_review", "published"]));
  return rows.map((r) => r.name);
}
