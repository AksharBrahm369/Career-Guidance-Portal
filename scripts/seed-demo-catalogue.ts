import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { courseInstitutes, courseLearningResources, courses, institutes } from "../db/schema";
import {
  DEMO_COURSES,
  DEMO_INSTITUTES,
  DEMO_LEARNING_RESOURCES,
  type DemoCourse,
} from "../db/seed/courses.demo";

async function main() {
  const instituteIdBySlug = new Map<string, string>();
  let instIns = 0;
  let instSkip = 0;
  for (const i of DEMO_INSTITUTES) {
    const existing = await db.query.institutes.findFirst({ where: eq(institutes.slug, i.slug) });
    if (existing) {
      instituteIdBySlug.set(i.slug, existing.id);
      instSkip++;
      continue;
    }
    const [row] = await db
      .insert(institutes)
      .values({
        slug: i.slug,
        name: i.name,
        instituteType: i.instituteType,
        rankingTag: i.rankingTag,
        city: i.city,
        state: i.state,
        websiteUrl: i.websiteUrl ?? null,
        status: "published",
      })
      .returning({ id: institutes.id });
    instituteIdBySlug.set(i.slug, row!.id);
    instIns++;
  }

  let courseIns = 0;
  let courseSkip = 0;
  let linkIns = 0;
  let resourceIns = 0;
  for (const c of DEMO_COURSES) {
    let course = await db.query.courses.findFirst({ where: eq(courses.slug, c.slug) });
    if (course) {
      courseSkip++;
    } else {
      const [row] = await db
        .insert(courses)
        .values({
          slug: c.slug,
          courseName: c.courseName,
          stream: c.stream,
          careerClusters: c.careerClusters,
          aiSafetyTag: c.aiSafetyTag,
          description: c.description,
          tenureYears: c.tenureYears,
          eligibilityCriteria: c.eligibilityCriteria,
          entranceExams: c.entranceExams,
          requiredSubjects: c.requiredSubjects,
          eligibility: c.eligibility,
          status: "published",
          source: "manual",
          publishedAt: new Date(),
        })
        .returning();
      course = row!;
      courseIns++;
    }

    for (const instSlug of c.institutes) {
      const instituteId = instituteIdBySlug.get(instSlug);
      if (!instituteId) continue;
      const res = await db
        .insert(courseInstitutes)
        .values({ courseId: course.id, instituteId })
        .onConflictDoNothing()
        .returning({ id: courseInstitutes.id });
      if (res.length > 0) linkIns++;
    }

    for (const resource of resourcesForCourse(c)) {
      const res = await db
        .insert(courseLearningResources)
        .values({
          courseId: course.id,
          title: resource.title,
          url: resource.url,
          platform: resource.platform,
          resourceType: resource.resourceType,
          description: resource.description,
          thumbnailUrl: resource.thumbnailUrl ?? null,
          language: resource.language,
          difficulty: resource.difficulty,
          isFree: resource.isFree,
          status: "published",
          source: "manual",
        })
        .onConflictDoNothing()
        .returning({ id: courseLearningResources.id });
      if (res.length > 0) resourceIns++;
    }
  }

  console.log(
    `✓ Demo catalogue: institutes ${instIns} inserted / ${instSkip} skipped; courses ${courseIns} inserted / ${courseSkip} skipped; links ${linkIns} inserted`,
  );
  console.log(`Learning resources ${resourceIns} inserted`);
  process.exit(0);
}

function resourcesForCourse(course: DemoCourse) {
  const name = course.courseName.toLowerCase();
  return DEMO_LEARNING_RESOURCES.filter((resource) => {
    if (resource.courseSlug === course.slug) return true;
    return resource.courseNameIncludes?.some((match) => name.includes(match)) ?? false;
  });
}

main().catch((err) => {
  console.error("✗ Demo catalogue seed failed:", err);
  process.exit(1);
});
