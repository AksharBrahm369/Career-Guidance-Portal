import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { careerClusters, courses } from "@/db/schema";
import type { ClusterInput, CourseInput } from "./types";

/** Active clusters + published courses, shaped for the pure recommendation engine. */
export async function getRecommendationInputs(): Promise<{
  clusters: ClusterInput[];
  courses: CourseInput[];
}> {
  const [clusterRows, courseRows] = await Promise.all([
    db.select().from(careerClusters).where(eq(careerClusters.active, true)),
    db.select().from(courses).where(eq(courses.status, "published")),
  ]);
  return {
    clusters: clusterRows.map((c) => ({
      key: c.key,
      name: c.name,
      targetProfile: c.targetProfile,
      lensWeights: c.lensWeights,
    })),
    courses: courseRows.map((c) => ({
      id: c.id,
      slug: c.slug,
      courseName: c.courseName,
      stream: c.stream,
      careerClusters: c.careerClusters,
      requiredSubjects: c.requiredSubjects,
      eligibility: c.eligibility ?? null,
    })),
  };
}
