import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { assessmentStatus } from "./enums";
import { students } from "./students";

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: assessmentStatus("status").notNull().default("in_progress"),
    aptitudeScores: jsonb("aptitude_scores").$type<
      Record<string, { raw: number; total: number; band: "strong" | "moderate" | "developing" }>
    >(),
    workStyleScores: jsonb("work_style_scores").$type<Record<string, number>>(),
    interestData: jsonb("interest_data").$type<Record<string, number>>(),
    knownStream: text("known_stream"),
    careerClustersRanked: text("career_clusters_ranked")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    responses: jsonb("responses").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    marks: jsonb("marks").$type<{ board: string; stream: string; subjects: Record<string, number>; strengths: string[] }>(),
    confidence: text("confidence"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    studentIdx: index("assessments_student_idx").on(t.studentId),
  }),
);

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
