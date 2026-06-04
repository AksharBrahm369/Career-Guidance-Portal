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
import { uniqueSlug } from "@/lib/slug";
import type { CourseFetchResult } from "@/lib/ai/safe-fetch";

/** Extra fields accepted on the manual-create path; absent on AI-fetch. */
export interface ManualExtras {
  requiredSubjects?: string[];
  eligibility?: {
    minAggregate?: number;
    minBySubject?: Record<string, number>;
    requiredStreamSubjects?: string[];
    entranceExams?: string[];
  } | null;
}

export type PersistData = CourseFetchResult & ManualExtras;

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

export async function persistFetchedCourse(
  data: PersistData,
  ctx: PersistContext,
): Promise<PersistResult> {
  const result = await db.transaction(async (tx) => {
    const allCourseSlugs = await tx.select({ slug: courses.slug }).from(courses);
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
      aiSafetyReasoning: data.aiSafetyReasoning,
      description: data.description,
      tenureYears: String(data.tenureYears),
      eligibilityCriteria: data.eligibilityCriteria,
      entranceExams: data.entranceExams,
      feesMinInr: data.feesMinInr != null ? String(data.feesMinInr) : null,
      feesMaxInr: data.feesMaxInr != null ? String(data.feesMaxInr) : null,
      requiredSubjects: data.requiredSubjects ?? [],
      eligibility: data.eligibility ?? null,
      sourceUrls: data.sourceUrls,
      status: "pending_review",
      source: ctx.source,
      createdByAdminId: ctx.adminId,
      fetchedAt: ctx.source === "ai_fetch" ? new Date() : null,
    };

    const [insertedCourse] = await tx.insert(courses).values(newCourse).returning({
      id: courses.id,
      slug: courses.slug,
    });
    if (!insertedCourse) throw new Error("Failed to insert course");

    const usedSlugs = new Set<string>();
    const instituteIds: string[] = [];

    for (const inst of data.institutes) {
      const baseSlug = uniqueSlug(`${inst.name} ${inst.city}`, usedSlugs);

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

      const [created] = await tx
        .insert(institutes)
        .values(newInst)
        .onConflictDoNothing({ target: institutes.slug })
        .returning({ id: institutes.id, slug: institutes.slug });

      let instituteId = created?.id;
      if (!instituteId) {
        const existing = await tx.query.institutes.findFirst({
          where: eq(institutes.slug, baseSlug),
        });
        if (!existing) throw new Error(`Institute upsert failed for slug ${baseSlug}`);
        instituteId = existing.id;
      }
      usedSlugs.add(baseSlug);
      instituteIds.push(instituteId);
    }

    if (instituteIds.length > 0) {
      await tx
        .insert(courseInstitutes)
        .values(
          instituteIds.map((instituteId) => ({
            courseId: insertedCourse.id,
            instituteId,
          })),
        )
        .onConflictDoNothing();
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

    return {
      courseId: insertedCourse.id,
      slug: insertedCourse.slug,
      instituteIds,
    };
  });

  return result;
}

export async function getExistingCourseNames(): Promise<string[]> {
  const rows = await db
    .select({ name: courses.courseName, status: courses.status })
    .from(courses)
    .where(inArray(courses.status, ["pending_review", "published"]));
  return rows.map((r) => r.name);
}
