import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Target profile a student's lens scores are matched against, and the
 * per-cluster lens weights used by the recommendation engine (Plan 3).
 * Shapes are intentionally open jsonb so the engine can evolve weights
 * without a migration; admin tooling validates them with Zod.
 */
export type ClusterTargetProfile = {
  interests: Record<string, number>; // RIASEC key -> 0..1 emphasis
  aptitude: Record<string, number>; // sub-ability key -> 0..1 emphasis
  workStyle: Record<string, number>; // trait key -> 0..1 emphasis
};

export type ClusterLensWeights = {
  interests: number;
  aptitude: number;
  marks: number;
  workStyle: number;
};

export const careerClusters = pgTable(
  "career_clusters",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    targetProfile: jsonb("target_profile").$type<ClusterTargetProfile>().notNull(),
    lensWeights: jsonb("lens_weights").$type<ClusterLensWeights>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("career_clusters_active_idx").on(t.active),
  }),
);

export type CareerCluster = typeof careerClusters.$inferSelect;
export type NewCareerCluster = typeof careerClusters.$inferInsert;
