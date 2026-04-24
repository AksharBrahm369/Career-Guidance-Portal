import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { admins } from "./admins";
import { aiSafetyTag, courseSource, courseStatus, streamEnum } from "./enums";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    courseName: text("course_name").notNull(),
    courseCode: text("course_code"),
    stream: streamEnum("stream").notNull(),
    careerClusters: text("career_clusters").array().notNull().default(sql`ARRAY[]::text[]`),
    aiSafetyTag: aiSafetyTag("ai_safety_tag").notNull(),
    aiSafetyTagAi: aiSafetyTag("ai_safety_tag_ai"),
    description: text("description").notNull(),
    tenureYears: numeric("tenure_years", { precision: 4, scale: 2 }).notNull(),
    eligibilityCriteria: text("eligibility_criteria").notNull(),
    entranceExams: text("entrance_exams").array().notNull().default(sql`ARRAY[]::text[]`),
    feesMinInr: numeric("fees_min_inr", { precision: 12, scale: 2 }),
    feesMaxInr: numeric("fees_max_inr", { precision: 12, scale: 2 }),
    sourceUrls: text("source_urls").array().notNull().default(sql`ARRAY[]::text[]`),
    status: courseStatus("status").notNull().default("draft"),
    source: courseSource("source").notNull(),
    createdByAdminId: uuid("created_by_admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    lastEditedByAdminId: uuid("last_edited_by_admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("courses_status_idx").on(t.status),
    streamIdx: index("courses_stream_idx").on(t.stream),
  }),
);

export const courseInstitutes = pgTable("course_institutes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").notNull(),
  instituteId: uuid("institute_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
