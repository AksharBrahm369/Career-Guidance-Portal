import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";

export type QuestionModule = "interests" | "work_style" | "aptitude";

/** Active question-bank rows for a scored module, in insertion order. */
export function getActiveItems(module: QuestionModule) {
  return db
    .select()
    .from(questionBank)
    .where(and(eq(questionBank.module, module), eq(questionBank.isActive, true)));
}
