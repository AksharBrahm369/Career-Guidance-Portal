import "server-only";
import { eq } from "drizzle-orm";
import { STARTER_CLUSTERS } from "@/db/seed/clusters";
import { db } from "@/lib/db";
import { careerClusters, courses } from "@/db/schema";
import type { ClusterInput, CourseInput } from "./types";

function clusterLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

const CLUSTER_ALIAS_PATTERNS: Array<{ key: string; patterns: RegExp[] }> = [
  {
    key: "engineering-technology",
    patterns: [
      /\bengineering\b/i,
      /\btechnology\b/i,
      /\bsoftware\b/i,
      /\binformation technology\b/i,
      /\bit\s*&?\s*systems\b/i,
      /\belectronics\b/i,
      /\bcomputer applications?\b/i,
      /\bmanufacturing\b/i,
      /\bproduction\b/i,
      /\bmaritime\b/i,
      /\bshipping\b/i,
      /\baerospace\b/i,
      /\bdefen[cs]e\b/i,
      /\bmaintenance\b/i,
      /\brepair\b/i,
      /\bresearch & applied sciences\b/i,
    ],
  },
  {
    key: "healthcare-life-sciences",
    patterns: [
      /\bhealth/i,
      /\bmedical\b/i,
      /\bmedicine\b/i,
      /\blife sciences?\b/i,
      /\bbiology\b/i,
      /\bbiotechnology\b/i,
      /\bnursing\b/i,
      /\bpharmacy\b/i,
    ],
  },
  {
    key: "commerce-management",
    patterns: [
      /\bcommerce\b/i,
      /\bmanagement\b/i,
      /\badministration\b/i,
      /\bbusiness\b/i,
      /\bfinance\b/i,
      /\baccount/i,
      /\blogistics\b/i,
      /\bsupply chain\b/i,
      /\boperations\b/i,
    ],
  },
];

function aliasClusterKey(value: string, knownKeys: Set<string>): string | null {
  for (const alias of CLUSTER_ALIAS_PATTERNS) {
    if (!knownKeys.has(alias.key)) continue;
    if (alias.patterns.some((pattern) => pattern.test(value))) return alias.key;
  }
  return null;
}

export function normalizeCourseClusterKeys(
  courseClusters: string[],
  clusters: Pick<ClusterInput, "key" | "name">[],
): string[] {
  const knownKeys = new Set(clusters.map((c) => c.key));
  const keyByName = new Map(clusters.map((c) => [clusterLookupKey(c.name), c.key]));

  return Array.from(new Set(courseClusters.map((cluster) => {
    if (knownKeys.has(cluster)) return cluster;
    return keyByName.get(clusterLookupKey(cluster)) ?? aliasClusterKey(cluster, knownKeys) ?? cluster;
  })));
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
  const clusters =
    shapedClusters.length > 0
      ? shapedClusters
      : STARTER_CLUSTERS.map((c) => ({
          key: c.key,
          name: c.name,
          targetProfile: c.targetProfile,
          lensWeights: c.lensWeights,
        }));

  return {
    clusters,
    courses: courseRows.map((c) => ({
      id: c.id,
      slug: c.slug,
      courseName: c.courseName,
      stream: c.stream,
      careerClusters: normalizeCourseClusterKeys(c.careerClusters, clusters),
      requiredSubjects: c.requiredSubjects,
      description: c.description,
      eligibilityCriteria: c.eligibilityCriteria,
      entranceExams: c.entranceExams,
      eligibility: c.eligibility ?? null,
    })),
  };
}
