import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel } from "./client";
import { verifyUrls } from "@/lib/url-verify";

export const StreamEnum = z.enum(["science", "commerce", "arts", "vocational"]);
export const AiSafetyTagEnum = z.enum(["ai_safe", "ai_augmented", "ai_risk"]);
export const InstituteTypeEnum = z.enum([
  "government",
  "private",
  "deemed",
  "autonomous",
  "international",
]);

export const FetchedInstitute = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  instituteType: InstituteTypeEnum,
  annualFeesInr: z.number().nonnegative().optional(),
  websiteUrl: z.string().url().optional(),
});

export const CourseFetchResult = z.object({
  courseName: z.string().min(1),
  courseCode: z.string().optional(),
  stream: StreamEnum,
  careerClusters: z.array(z.string().min(1)).min(1).max(6),
  aiSafetyTag: AiSafetyTagEnum,
  aiSafetyReasoning: z.string().min(1),
  description: z.string().min(150),
  tenureYears: z.number().positive().max(10),
  eligibilityCriteria: z.string().min(1),
  entranceExams: z.array(z.string()).max(8).default([]),
  feesMinInr: z.number().nonnegative().optional(),
  feesMaxInr: z.number().nonnegative().optional(),
  institutes: z.array(FetchedInstitute).min(1).max(15),
  sourceUrls: z.array(z.string().url()).max(8).default([]),
});

export type CourseFetchResult = z.infer<typeof CourseFetchResult>;
export type FetchedInstitute = z.infer<typeof FetchedInstitute>;

const SYSTEM_PROMPT = `You are a career guidance research assistant for an Indian education platform.

Your task is to research ONE academic course offered in India and return structured data about it.
Focus exclusively on courses available at Indian institutes for students who completed grades 10–12.

Hard rules:
- Return exactly ONE course per call. Do not invent multiple courses in a single response.
- When queried broadly (e.g. "All BSc IT courses"), each call will cover a distinct variation or specialization — your job is to pick the BEST match that is NOT already in the exclusion list.
- description must be at least 150 words and explain what the course covers, typical career outcomes, and who it suits.
- aiSafetyTag classifies how exposed careers from this course are to AI automation:
  - ai_safe: human skills are core, automation risk low (e.g. surgery, social work, primary teaching)
  - ai_augmented: AI assists meaningfully but human expertise stays essential (e.g. radiology, accounting, journalism)
  - ai_risk: significant automation risk; continuous upskilling needed (e.g. routine data entry, basic translation)
- aiSafetyReasoning: one or two sentences justifying the tag.
- institutes: 5–15 real Indian institutes that offer this course. Include a mix of government and private. Prefer well-known, currently-active institutes.
- entranceExams: only list real Indian entrance exams (e.g. NEET, JEE Main, CLAT, CUET, NATA). Empty if none required.
- careerClusters: short broad labels like "Healthcare", "Engineering & Technology", "Architecture & Design", "Research & Applied Sciences", "Law & Public Policy".
- Stream maps to: science (PCM/PCB), commerce, arts, vocational.

Critical: if the requested course already exists in the EXCLUSION LIST below, return a course that is genuinely distinct (different specialization or sub-field). Do NOT return a near-duplicate.`;

export interface SafeFetchOptions {
  query: string;
  excludeNames: string[];
  scope?: "course" | "institute" | "both";
}

export interface SafeFetchResult {
  course: CourseFetchResult;
  provider: string;
  warnings: string[];
}

export interface SafeFetchBatchResult {
  results: SafeFetchResult[];
  /** Names that failed to be fetched (e.g. AI returned no output on that iteration) */
  failures: string[];
}

export async function safeFetchCourse(options: SafeFetchOptions): Promise<SafeFetchResult> {
  const { query, excludeNames } = options;
  const { model, providerLabel } = getModel("fetch");

  const exclusionBlock =
    excludeNames.length === 0
      ? "(none — feel free to return any matching course)"
      : excludeNames
          .slice(0, 200)
          .map((n, i) => `  ${i + 1}. ${n}`)
          .join("\n");

  const userPrompt = `Research this course query and return one structured course entry.

QUERY: ${query}

EXCLUSION LIST (do not return any of these or near-duplicates):
${exclusionBlock}`;

  const { experimental_output, finishReason } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    experimental_output: Output.object({ schema: CourseFetchResult }),
    temperature: 0.4,
    maxRetries: 2,
  });

  if (!experimental_output) {
    throw new FetchFailedError(
      `AI provider returned no structured output (finishReason: ${finishReason}).`,
    );
  }

  const warnings: string[] = [];
  const fetched = experimental_output;

  // Soft duplicate warning — don't reject, just flag.
  const lowered = fetched.courseName.trim().toLowerCase();
  for (const existing of excludeNames) {
    if (similarityScore(lowered, existing.trim().toLowerCase()) > 0.85) {
      warnings.push(
        `AI returned "${fetched.courseName}" which is >85% similar to existing "${existing}".`,
      );
      break;
    }
  }

  // Verify source URLs and drop dead ones; keep "unknown" (transient blips).
  if (fetched.sourceUrls.length > 0) {
    const verification = await verifyUrls(fetched.sourceUrls);
    if (verification.dead.length > 0) {
      for (const dead of verification.dead) {
        warnings.push(`Dropped source URL that returned 4xx/5xx: ${dead}`);
      }
    }
    fetched.sourceUrls = [...verification.ok, ...verification.unknown];
  }

  return { course: fetched, provider: providerLabel, warnings };
}

/**
 * Fetches multiple distinct courses by calling safeFetchCourse in sequence.
 * Each iteration adds the previously fetched course to the exclusion list so
 * the AI is forced to return a genuinely different variation.
 *
 * @param options - Same as SafeFetchOptions but with an additional `count`.
 * @param count   - How many courses to fetch (1–20).
 * @param onEach  - Optional callback invoked after each successful fetch (for streaming UX).
 */
export async function safeFetchCourses(
  options: SafeFetchOptions,
  count: number,
  onEach?: (result: SafeFetchResult, index: number) => void,
): Promise<SafeFetchBatchResult> {
  const clampedCount = Math.max(1, Math.min(20, count));
  const results: SafeFetchResult[] = [];
  const failures: string[] = [];

  // Start with the caller-supplied exclusion list and grow it as we fetch.
  const runningExcludes = [...options.excludeNames];

  for (let i = 0; i < clampedCount; i++) {
    try {
      const result = await safeFetchCourse({
        ...options,
        excludeNames: runningExcludes,
      });
      results.push(result);
      // Add the fetched course name so the next call won't return the same one.
      runningExcludes.push(result.course.courseName);
      onEach?.(result, i);
    } catch (err) {
      const label =
        err instanceof FetchFailedError
          ? `Iteration ${i + 1}: ${err.message}`
          : `Iteration ${i + 1}: ${err instanceof Error ? err.message : String(err)}`;
      failures.push(label);
      // Continue so we still try the remaining iterations.
    }
  }

  return { results, failures };
}

export class FetchFailedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FetchFailedError";
  }
}

// Cheap Dice coefficient on bigrams — good enough for "looks the same?" warnings.
function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const aBi = bigrams(a);
  const bBi = bigrams(b);
  let intersect = 0;
  for (const bi of aBi) if (bBi.has(bi)) intersect++;
  return (2 * intersect) / (aBi.size + bBi.size);
}
