import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { assessmentModule } from "./enums";

export const questionBank = pgTable(
  "question_bank",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    module: assessmentModule("module").notNull(),
    dimension: text("dimension").notNull(),
    questionText: text("question_text").notNull(),
    options: jsonb("options").$type<Array<{ id: string; text: string }>>().notNull(),
    correctOptionId: text("correct_option_id"),
    scoringMap: jsonb("scoring_map").$type<Record<string, Record<string, number>>>(),
    source: text("source").notNull().default("authored"),
    license: text("license"),
    version: integer("version").notNull().default(1),
    poolGroup: text("pool_group"),
    media: jsonb("media").$type<{ stem?: string; options?: Record<string, string> }>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    moduleIdx: index("question_bank_module_idx").on(t.module),
    activeIdx: index("question_bank_active_idx").on(t.isActive),
  }),
);

export type Question = typeof questionBank.$inferSelect;
export type NewQuestion = typeof questionBank.$inferInsert;
