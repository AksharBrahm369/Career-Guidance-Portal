import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { careerClusters, courses } from "@/db/schema";
import type { ClusterInput, CourseInput } from "./types";

function clusterLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeCourseClusterKeys(
  courseClusters: string[],
  clusters: Pick<ClusterInput, "key" | "name">[],
): string[] {
  const knownKeys = new Set(clusters.map((c) => c.key));
  const keyByName = new Map(clusters.map((c) => [clusterLookupKey(c.name), c.key]));

  return courseClusters.map((cluster) => {
    if (knownKeys.has(cluster)) return cluster;
    return keyByName.get(clusterLookupKey(cluster)) ?? cluster;
  });
}

/** Active clusters + published courses, shaped for the pure recommendation engine. */
export async function getRecommendationInputs(): Promise<{
  clusters: ClusterInput[];
  courses: CourseInput[];
}> {
  const [clusterRows, courseRows] = await Promise.all([
    db.select().from(careerClusters).where(eq(careerClusters.active, true)),
    db.select().from(courses).where(eq(courses.status, "published")),
  ]);
  const shapedClusters = clusterRows.map((c) => ({
    key: c.key,
    name: c.name,
    targetProfile: c.targetProfile,
    lensWeights: c.lensWeights,
  }));

  return {
    clusters: shapedClusters,
    courses: courseRows.map((c) => ({
      id: c.id,
      slug: c.slug,
      courseName: c.courseName,
      stream: c.stream,
      careerClusters: normalizeCourseClusterKeys(c.careerClusters, shapedClusters),
      requiredSubjects: c.requiredSubjects,
      eligibility: c.eligibility ?? null,
    })),
  };
}
