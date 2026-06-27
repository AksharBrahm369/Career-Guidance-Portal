import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  courseLearningResources,
  courses,
  LEARNING_RESOURCE_DIFFICULTIES,
  LEARNING_RESOURCE_LANGUAGES,
  LEARNING_RESOURCE_SOURCES,
  LEARNING_RESOURCE_STATUSES,
  LEARNING_RESOURCE_TYPES,
  type CourseLearningResource,
  type LearningResourceStatus,
  type LearningResourceSource,
  type NewCourseLearningResource,
} from "@/db/schema";
import { verifyUrls } from "@/lib/url-verify";

export const LearningResourceBody = z.object({
  title: z.string().trim().min(3).max(200),
  url: z.string().trim().url().max(1000).refine(isHttpUrl, "URL must start with http or https"),
  platform: z.string().trim().min(2).max(80),
  resourceType: z.enum(LEARNING_RESOURCE_TYPES),
  description: z.string().trim().min(10).max(700),
  thumbnailUrl: z
    .string()
    .trim()
    .url()
    .max(1000)
    .refine(isHttpUrl, "Thumbnail URL must start with http or https")
    .nullable()
    .optional(),
  language: z.enum(LEARNING_RESOURCE_LANGUAGES),
  difficulty: z.enum(LEARNING_RESOURCE_DIFFICULTIES),
  isFree: z.boolean().default(true),
  status: z.enum(LEARNING_RESOURCE_STATUSES).default("draft"),
  source: z.enum(LEARNING_RESOURCE_SOURCES).default("manual"),
});

export const LearningResourcePatchBody = LearningResourceBody.partial()
  .extend({
    status: z.enum(LEARNING_RESOURCE_STATUSES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "no fields to update" });

export type LearningResourceInput = z.infer<typeof LearningResourceBody>;
export type LearningResourcePatch = z.infer<typeof LearningResourcePatchBody>;

export function buildDefaultLearningResource(
  courseName: string,
  options: {
    status?: LearningResourceStatus;
    source?: LearningResourceSource;
  } = {},
): Omit<NewCourseLearningResource, "courseId"> {
  return {
    title: `Learn ${courseName}`,
    url: youtubeLearningSearchFor(courseName),
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A beginner-friendly YouTube search link for learning this course. Admin can replace it with a specific verified playlist or video before publishing.",
    thumbnailUrl: null,
    language: "Mixed",
    difficulty: "Beginner",
    isFree: true,
    status: options.status ?? "draft",
    source: options.source ?? "manual",
  };
}

export function youtubeLearningSearchFor(courseName: string): string {
  const query = `${courseName} beginner course tutorial`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export async function getCourseForResourceFetch(courseId: string) {
  return db.query.courses.findFirst({ where: eq(courses.id, courseId) });
}

export async function listLearningResourcesForCourse(
  courseId: string,
  options: { publishedOnly?: boolean } = {},
): Promise<CourseLearningResource[]> {
  const conditions = [eq(courseLearningResources.courseId, courseId)];
  if (options.publishedOnly) {
    conditions.push(eq(courseLearningResources.status, "published"));
  }

  return db
    .select()
    .from(courseLearningResources)
    .where(and(...conditions))
    .orderBy(desc(courseLearningResources.status), desc(courseLearningResources.updatedAt));
}

export async function createLearningResource(
  courseId: string,
  input: LearningResourceInput,
): Promise<CourseLearningResource> {
  const [row] = await db
    .insert(courseLearningResources)
    .values(normalizeInput({ ...input, courseId }))
    .onConflictDoUpdate({
      target: [courseLearningResources.courseId, courseLearningResources.url],
      set: {
        title: input.title,
        platform: input.platform,
        resourceType: input.resourceType,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl ?? null,
        language: input.language,
        difficulty: input.difficulty,
        isFree: input.isFree,
        source: input.source,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row!;
}

export async function createLearningResources(
  courseId: string,
  inputs: LearningResourceInput[],
): Promise<CourseLearningResource[]> {
  const rows: CourseLearningResource[] = [];
  for (const input of inputs) {
    rows.push(await createLearningResource(courseId, input));
  }
  return rows;
}

export async function updateLearningResource(
  resourceId: string,
  patch: LearningResourcePatch,
): Promise<CourseLearningResource | null> {
  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) update[key] = value;
  }
  if ("thumbnailUrl" in patch) update.thumbnailUrl = patch.thumbnailUrl ?? null;

  const [row] = await db
    .update(courseLearningResources)
    .set(update)
    .where(eq(courseLearningResources.id, resourceId))
    .returning();

  return row ?? null;
}

export async function deleteLearningResource(resourceId: string): Promise<boolean> {
  const rows = await db
    .delete(courseLearningResources)
    .where(eq(courseLearningResources.id, resourceId))
    .returning({ id: courseLearningResources.id });
  return rows.length > 0;
}

export async function verifyLearningResourceUrl(url: string): Promise<{
  ok: boolean;
  warning?: string;
}> {
  const verification = await verifyUrls([url]);
  if (verification.dead.includes(url)) {
    return { ok: false, warning: "URL looks invalid or returned an error status." };
  }
  if (verification.unknown.includes(url)) {
    return {
      ok: true,
      warning: "URL could not be fully verified, but it was not saved as a dead link.",
    };
  }
  return { ok: true };
}

function normalizeInput(
  input: LearningResourceInput & { courseId: string },
): NewCourseLearningResource {
  return {
    courseId: input.courseId,
    title: input.title,
    url: input.url,
    platform: input.platform,
    resourceType: input.resourceType,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl ?? null,
    language: input.language,
    difficulty: input.difficulty,
    isFree: input.isFree,
    status: input.status as LearningResourceStatus,
    source: input.source,
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
