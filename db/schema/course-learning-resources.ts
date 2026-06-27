import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid, boolean } from "drizzle-orm/pg-core";
import { courses } from "./courses";

export const LEARNING_RESOURCE_TYPES = [
  "YouTube Video",
  "Website",
  "Free Course",
  "Tutorial",
] as const;

export const LEARNING_RESOURCE_LANGUAGES = ["English", "Hindi", "Mixed"] as const;

export const LEARNING_RESOURCE_DIFFICULTIES = ["Beginner", "Intermediate"] as const;

export const LEARNING_RESOURCE_STATUSES = ["draft", "published"] as const;

export const LEARNING_RESOURCE_SOURCES = ["ai", "manual"] as const;

export type LearningResourceType = (typeof LEARNING_RESOURCE_TYPES)[number];
export type LearningResourceLanguage = (typeof LEARNING_RESOURCE_LANGUAGES)[number];
export type LearningResourceDifficulty = (typeof LEARNING_RESOURCE_DIFFICULTIES)[number];
export type LearningResourceStatus = (typeof LEARNING_RESOURCE_STATUSES)[number];
export type LearningResourceSource = (typeof LEARNING_RESOURCE_SOURCES)[number];

export const courseLearningResources = pgTable(
  "course_learning_resources",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    platform: text("platform").notNull(),
    resourceType: text("resource_type").$type<LearningResourceType>().notNull(),
    description: text("description").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    language: text("language").$type<LearningResourceLanguage>().notNull(),
    difficulty: text("difficulty").$type<LearningResourceDifficulty>().notNull(),
    isFree: boolean("is_free").notNull().default(true),
    status: text("status").$type<LearningResourceStatus>().notNull().default("draft"),
    source: text("source").$type<LearningResourceSource>().notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    courseStatusIdx: index("course_learning_resources_course_status_idx").on(t.courseId, t.status),
    courseUrlUq: uniqueIndex("course_learning_resources_course_url_uq").on(t.courseId, t.url),
  }),
);

export type CourseLearningResource = typeof courseLearningResources.$inferSelect;
export type NewCourseLearningResource = typeof courseLearningResources.$inferInsert;
