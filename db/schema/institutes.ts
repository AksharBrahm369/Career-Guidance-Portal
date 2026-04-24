import { sql } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { courseStatus, instituteType, rankingTag } from "./enums";

export const institutes = pgTable(
  "institutes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    instituteType: instituteType("institute_type").notNull(),
    rankingTag: rankingTag("ranking_tag").notNull().default("unranked"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    region: text("region"),
    annualFeesInr: numeric("annual_fees_inr", { precision: 12, scale: 2 }),
    websiteUrl: text("website_url"),
    status: courseStatus("status").notNull().default("draft"),
    bestFitTags: text("best_fit_tags").array().notNull().default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stateIdx: index("institutes_state_idx").on(t.state),
    statusIdx: index("institutes_status_idx").on(t.status),
  }),
);

export type Institute = typeof institutes.$inferSelect;
export type NewInstitute = typeof institutes.$inferInsert;
