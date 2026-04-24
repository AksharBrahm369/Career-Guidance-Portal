import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { students } from "./students";

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    aptitudeScores: jsonb("aptitude_scores").$type<Record<string, number>>(),
    innateScores: jsonb("innate_scores").$type<Record<string, number>>(),
    interestData: jsonb("interest_data").$type<Record<string, unknown>>(),
    recommendedStream: text("recommended_stream"),
    careerClustersRanked: text("career_clusters_ranked")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    studentIdx: index("assessments_student_idx").on(t.studentId),
  }),
);

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
