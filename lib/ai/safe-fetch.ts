import "server-only";
import { z } from "zod";

/**
 * Scaffold-only. Real implementation lands in M2 with:
 *   - Anthropic tool use ("get_course_info" tool with JSON schema below)
 *   - Prompt caching on the system prompt (static exclusion-aware instructions)
 *   - Exclusion list of existing course names passed in user message
 *   - Zod validation of tool_use input against CourseFetchResult before returning
 */

export const CourseFetchResult = z.object({
  courseName: z.string(),
  courseCode: z.string().optional(),
  stream: z.enum(["science", "commerce", "arts", "vocational"]),
  careerClusters: z.array(z.string()).min(1),
  aiSafetyTag: z.enum(["ai_safe", "ai_augmented", "ai_risk"]),
  description: z.string().min(150),
  tenureYears: z.number().positive(),
  eligibilityCriteria: z.string(),
  entranceExams: z.array(z.string()),
  feesMinInr: z.number().nonnegative().optional(),
  feesMaxInr: z.number().nonnegative().optional(),
  institutes: z.array(
    z.object({
      name: z.string(),
      city: z.string(),
      state: z.string(),
      instituteType: z.enum(["government", "private", "deemed", "autonomous", "international"]),
      annualFeesInr: z.number().nonnegative().optional(),
      websiteUrl: z.string().url().optional(),
    }),
  ),
  sourceUrls: z.array(z.string().url()),
});

export type CourseFetchResult = z.infer<typeof CourseFetchResult>;

export class NotImplementedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NotImplementedError";
  }
}

export async function safeFetchCourse(
  _query: string,
  _excludeNames: string[],
): Promise<CourseFetchResult> {
  throw new NotImplementedError("safeFetchCourse arrives in M2");
}
