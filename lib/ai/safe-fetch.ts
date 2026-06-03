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
  sourceUrls: z.array(z.string().url()).min(1).max(8),
});

export type CourseFetchResult = z.infer<typeof CourseFetchResult>;
export type FetchedInstitute = z.infer<typeof FetchedInstitute>;

const SYSTEM_PROMPT = `You are a career guidance research assistant for an Indian education platform.

Your task is to research academic courses offered in India based on the user's query and return a structured list of them.
Focus exclusively on courses available at Indian institutes for students who completed grades 10–12.

Hard rules:
- Return ALL relevant courses matching the query. Do NOT limit to a single course unless explicitly requested.
- Ensure a minimum of 5 distinct courses when available (if fewer exist, return all of them).
- If more than 5 are available, return the full set (no artificial limit).
- For specific course queries (e.g. "BSc IT"), return all related variations and equivalent programs.
- Do not return duplicate courses.
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
- sourceUrls: MUST provide at least 1-3 valid source URLs (e.g. official UGC/AICTE pages, university domains, or reputable education portals) confirming the course details. This is strictly required for every course.

Critical: if a requested course already exists in the EXCLUSION LIST below, do not return it. Return genuinely distinct courses.`;

export interface SafeFetchOptions {
  query: string;
  excludeNames: string[];
}

export interface SafeFetchResult {
  course: CourseFetchResult;
  provider: string;
  warnings: string[];
}

export interface SafeFetchBatchResult {
  results: SafeFetchResult[];
  failures: string[];
}

export const CoursesBatchOutput = z.object({
  courses: z.array(CourseFetchResult).describe("Array of relevant courses"),
});

export async function safeFetchCourseBatch(
  options: SafeFetchOptions,
): Promise<SafeFetchBatchResult> {
  const { query, excludeNames } = options;
  const { model, providerLabel } = getModel("fetch");

  const exclusionBlock =
    excludeNames.length === 0
      ? "(none — feel free to return any matching course)"
      : excludeNames
          .slice(0, 200)
          .map((n, i) => `  ${i + 1}. ${n}`)
          .join("\n");

  const userPrompt = `Research this course query and return ALL matching courses.

QUERY: ${query}

EXCLUSION LIST (do not return any of these or near-duplicates):
${exclusionBlock}`;

  const { experimental_output, finishReason } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    experimental_output: Output.object({ schema: CoursesBatchOutput }),
    temperature: 0.4,
    maxRetries: 2,
  });

  if (!experimental_output || !experimental_output.courses || experimental_output.courses.length === 0) {
    throw new FetchFailedError(
      `AI provider returned no structured output (finishReason: ${finishReason}).`,
    );
  }

  const results: SafeFetchResult[] = [];
  const failures: string[] = [];
  
  // We'll maintain a local exclusion list to prevent duplicate returns in the same payload
  const currentExcludes = [...excludeNames];

  for (const fetched of experimental_output.courses) {
    const warnings: string[] = [];
    const lowered = fetched.courseName.trim().toLowerCase();
    
    for (const existing of currentExcludes) {
      if (similarityScore(lowered, existing.trim().toLowerCase()) > 0.85) {
        warnings.push(
          `AI returned "${fetched.courseName}" which is >85% similar to existing "${existing}".`,
        );
        // If it's too similar to something we already have or just parsed, skip it if you want, 
        // but let's just flag it for now, as was the previous behavior.
        break;
      }
    }

    currentExcludes.push(fetched.courseName);

    // Verify source URLs
    if (fetched.sourceUrls && fetched.sourceUrls.length > 0) {
      const verification = await verifyUrls(fetched.sourceUrls);
      if (verification.dead.length > 0) {
        for (const dead of verification.dead) {
          warnings.push(`Dropped source URL that returned 4xx/5xx: ${dead}`);
        }
      }
      fetched.sourceUrls = [...verification.ok, ...verification.unknown];
    }

    results.push({ course: fetched, provider: providerLabel, warnings });
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
