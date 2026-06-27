import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { courseLearningResources, courses } from "../db/schema";

async function main() {
  const rows = await db
    .select({
      id: courses.id,
      courseName: courses.courseName,
      status: courses.status,
    })
    .from(courses);

  let inserted = 0;
  let published = 0;
  for (const course of rows) {
    const existingResources = await db
      .select({
        id: courseLearningResources.id,
        status: courseLearningResources.status,
      })
      .from(courseLearningResources)
      .where(eq(courseLearningResources.courseId, course.id));

    if (existingResources.length === 0) {
      const insertedRows = await db
        .insert(courseLearningResources)
        .values({
          courseId: course.id,
          title: `Learn ${course.courseName}`,
          url: youtubeLearningSearchFor(course.courseName),
          platform: "YouTube",
          resourceType: "YouTube Video",
          description:
            "A beginner-friendly YouTube search link for learning this course. Admin can replace it with a specific verified playlist or video before publishing.",
          thumbnailUrl: null,
          language: "Mixed",
          difficulty: "Beginner",
          isFree: true,
          status: course.status === "published" ? "published" : "draft",
          source: "manual",
        })
        .onConflictDoNothing()
        .returning({ id: courseLearningResources.id });

      if (insertedRows.length > 0) inserted++;
      if (course.status === "published" && insertedRows.length > 0) published++;
      continue;
    }

    const hasPublishedResource = existingResources.some(
      (resource) => resource.status === "published",
    );
    if (course.status === "published" && !hasPublishedResource) {
      const updatedRows = await db
        .update(courseLearningResources)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(courseLearningResources.courseId, course.id))
        .returning({ id: courseLearningResources.id });
      published += updatedRows.length;
    }
  }

  console.log(
    `Backfilled ${inserted} learning resource link(s); published ${published} resource link(s).`,
  );
  process.exit(0);
}

function youtubeLearningSearchFor(courseName: string): string {
  const query = `${courseName} beginner course tutorial`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

main().catch((err) => {
  console.error("Learning resource backfill failed:", err);
  process.exit(1);
});
