# Profiling Engine — Plan 2b: Assessment Flow + Scoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.
> **MANDATORY per the repo golden rules (CLAUDE.md):** before writing code, invoke the matching skill via the Skill tool — **`vercel-react-best-practices`** for any React/Next code (the UI + route handlers), **`shadcn`** for UI components. The assessment is **deterministic — NEVER call an LLM** (`ai-sdk` is not used here). Steps use checkbox (`- [ ]`) syntax.

**Goal:** A logged-in student (Plan 2a) completes the 4-module assessment (Interests → Work-style → Aptitude → Marks) with modular save/resume, and on final submit we **compute + persist the four lens scores** (the "Brain Profile"). No recommendation/ranking here — that's Plan 3; this plan ends at a stored, scored profile.

**Architecture:** Add the assessment-result columns to `assessments` (raw `responses` + `status` + per-lens score columns + `marks` + `confidence`). A **pure** scoring library (`lib/assessment/scoring/*`, fully unit-tested) turns raw responses + question-bank items into lens scores. Student-guarded API routes (`requireStudent` from Plan 2a) create/resume an attempt, save partial responses, and finalize (compute via the scoring lib inside a transaction). A server-component assessment shell fetches the in-progress attempt + active items in parallel; a client flow drives the 4 modules and saves per module. Replace the existing `POST /api/assessment/submit` 501 stub.

**Tech Stack (verified current APIs):** Drizzle 0.38 (`pgEnum`, `jsonb().$type<>()`, `db.transaction`, `db.query.X.findFirst`, `.returning()`), Next.js 15 (route handlers with `await params`; server components), NextAuth v5 (`requireStudent`), Zod 3.25 (v3 API), React 19 + Tailwind/shadcn, Vitest (`lib/**/*.test.ts`).

**Spec:** [`docs/superpowers/specs/2026-06-03-profiling-engine-design.md`](../specs/2026-06-03-profiling-engine-design.md) §4 (assessment), §8.2 (assessments schema). Build decisions: raw responses + status on the row, lens scores computed on completion; must complete all 4 modules.

**Done when:** a logged-in student can start → answer all 4 modules (save/resume works) → submit → an `assessments` row is `completed` with the 4 lens scores + confidence; `pnpm check` green; `pnpm build` compiles (Windows standalone-symlink EPERM is environmental).

---

## Data shapes (shared contract)

`responses` jsonb on `assessments`:
```ts
type AssessmentResponses = {
  interests?: Record<string, string>;   // questionId -> optionId
  work_style?: Record<string, string>;  // questionId -> optionId
  aptitude?: Record<string, string>;    // questionId -> optionId
  marks?: { board: string; stream: "science" | "commerce" | "arts" | "vocational"; subjects: Record<string, number> };
  timings?: Record<string, number>;     // module -> seconds spent (for confidence)
};
```
Lens score outputs (stored on `assessments`):
```ts
type RiasecProfile = Record<"R"|"I"|"A"|"S"|"E"|"C", number>;     // interestData
type WorkStyleProfile = Record<string, number>;                   // workStyleScores
type AptitudeProfile = Record<string, { raw: number; total: number; band: "strong"|"moderate"|"developing" }>; // aptitudeScores
type MarksProfile = { board: string; stream: string; subjects: Record<string, number>; strengths: string[] };  // marks
```

---

## File Structure

- `db/schema/enums.ts` (modify) — add `assessmentStatus` pgEnum.
- `db/schema/assessments.ts` (modify) — rename `innateScores`→`workStyleScores`, `recommendedStream`→`knownStream`; add `status`, `responses`, `marks`, `confidence`.
- `lib/assessment/scoring/interests.ts`, `work-style.ts`, `aptitude.ts`, `marks.ts`, `confidence.ts` (create) — pure functions.
- `lib/assessment/scoring/index.ts` (create) — `scoreAssessment(responses, items)` aggregator.
- `lib/assessment/items.ts` (create) — `getActiveItems(module)` server query helper.
- `app/api/assessment/start/route.ts` (create) — POST create/resume attempt.
- `app/api/assessment/[id]/responses/route.ts` (create) — PATCH save partial.
- `app/api/assessment/[id]/submit/route.ts` (create) — POST finalize.
- `app/api/assessment/submit/route.ts` (delete) — remove the 501 stub.
- `app/(student)/assessment/page.tsx` (modify) — landing/resume (server component).
- `app/(student)/assessment/[module]/page.tsx` + `components/student/assessment/*` (create) — module UI.
- Tests: `lib/__tests__/scoring-interests.test.ts`, `scoring-aptitude.test.ts`, `scoring-marks.test.ts`, `scoring-confidence.test.ts`.

---

## Task 1: Assessments schema changes

**Files:** `db/schema/enums.ts`, `db/schema/assessments.ts`; migration.

- [ ] **Step 1: Add the status enum** — in `db/schema/enums.ts`:
```ts
export const assessmentStatus = pgEnum("assessment_status", ["in_progress", "completed"]);
```
- [ ] **Step 2: Update the table** — in `db/schema/assessments.ts`: import `assessmentStatus`; rename column `innateScores` → `workStyleScores` (DB `work_style_scores`) and `recommendedStream` → `knownStream` (DB `known_stream`); add:
```ts
    status: assessmentStatus("status").notNull().default("in_progress"),
    responses: jsonb("responses").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    marks: jsonb("marks").$type<{ board: string; stream: string; subjects: Record<string, number>; strengths: string[] }>(),
    confidence: text("confidence"), // "high" | "moderate" | "low"
```
(Keep `aptitudeScores`, `interestData`, `careerClustersRanked`, timestamps, `studentId`.)
- [ ] **Step 3:** `pnpm db:generate`. The `assessments` table is empty — for the two renames, edit the generated SQL to use `ALTER TABLE "assessments" RENAME COLUMN "innate_scores" TO "work_style_scores";` and `... RENAME COLUMN "recommended_stream" TO "known_stream";` (avoid drop/recreate) if drizzle-kit emitted drop+add. Then `pnpm db:migrate && pnpm db:check` → no drift.
- [ ] **Step 4: Commit** `git add db/schema/enums.ts db/schema/assessments.ts drizzle/` → `feat(db): assessment status/responses/marks/confidence + rename innate->workStyle, recommendedStream->knownStream`

(Scoped-commit rule applies to every task: stage only the listed files; never `git add -A`; parked files `CLAUDE.md`/`.claude/skills/*`/`skills-lock.json` stay untouched.)

---

## Task 2: Scoring library (pure, TDD)

**INVOKE FIRST:** none needed (pure TS); follow TDD.

**Files:** `lib/assessment/scoring/{interests,work-style,aptitude,marks,confidence,index}.ts`; tests under `lib/__tests__/`.

Items passed to scorers are `question_bank` rows (have `id`, `module`, `dimension`, `options`, `correctOptionId`, `scoringMap`).

- [ ] **Step 1 (interests) — failing test** `lib/__tests__/scoring-interests.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { scoreInterests } from "@/lib/assessment/scoring/interests";

const items = [
  { id: "q1", dimension: "R", scoringMap: { a: { R: 1 }, b: { R: 5 } } },
  { id: "q2", dimension: "I", scoringMap: { a: { I: 1 }, b: { I: 5 } } },
];

describe("scoreInterests", () => {
  it("sums RIASEC contributions from chosen options", () => {
    const p = scoreInterests({ q1: "b", q2: "a" }, items);
    expect(p.R).toBe(5);
    expect(p.I).toBe(1);
    expect(p.A).toBe(0);
  });
  it("ignores responses with no matching item", () => {
    const p = scoreInterests({ qX: "b" }, items);
    expect(p.R).toBe(0);
  });
});
```
- [ ] **Step 2:** run → FAIL. **Step 3:** implement `lib/assessment/scoring/interests.ts`:
```ts
export type ScoringItem = { id: string; dimension: string; scoringMap?: Record<string, Record<string, number>> | null };
export type Riasec = Record<"R" | "I" | "A" | "S" | "E" | "C", number>;

const ZERO: Riasec = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

export function scoreInterests(responses: Record<string, string>, items: ScoringItem[]): Riasec {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: Riasec = { ...ZERO };
  for (const [qId, optId] of Object.entries(responses)) {
    const map = byId.get(qId)?.scoringMap?.[optId];
    if (!map) continue;
    for (const [dim, val] of Object.entries(map)) {
      if (dim in out) out[dim as keyof Riasec] += val;
    }
  }
  return out;
}
```
- [ ] **Step 4:** run → PASS. **Step 5:** commit `lib/assessment/scoring/interests.ts` + test → `feat(scoring): interests RIASEC scorer`

- [ ] **Step 6 (work-style)** — same shape as interests but arbitrary trait keys. Test `scoring-*` not strictly required (reuses the pattern), but add `lib/assessment/scoring/work-style.ts`:
```ts
import type { ScoringItem } from "./interests";

export function scoreWorkStyle(responses: Record<string, string>, items: ScoringItem[]): Record<string, number> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: Record<string, number> = {};
  for (const [qId, optId] of Object.entries(responses)) {
    const map = byId.get(qId)?.scoringMap?.[optId];
    if (!map) continue;
    for (const [trait, val] of Object.entries(map)) out[trait] = (out[trait] ?? 0) + val;
  }
  return out;
}
```
Commit with Step 11 (or its own commit).

- [ ] **Step 7 (aptitude) — failing test** `lib/__tests__/scoring-aptitude.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { scoreAptitude } from "@/lib/assessment/scoring/aptitude";

const items = [
  { id: "n1", dimension: "numerical", correctOptionId: "b" },
  { id: "n2", dimension: "numerical", correctOptionId: "a" },
  { id: "v1", dimension: "verbal", correctOptionId: "c" },
];

describe("scoreAptitude", () => {
  it("tallies correct answers per dimension and bands them", () => {
    const p = scoreAptitude({ n1: "b", n2: "a", v1: "x" }, items);
    expect(p.numerical).toEqual({ raw: 2, total: 2, band: "strong" });
    expect(p.verbal).toEqual({ raw: 0, total: 1, band: "developing" });
  });
});
```
- [ ] **Step 8:** run → FAIL. **Step 9:** implement `lib/assessment/scoring/aptitude.ts`:
```ts
export type AptitudeItem = { id: string; dimension: string; correctOptionId?: string | null };
export type AptitudeResult = Record<string, { raw: number; total: number; band: "strong" | "moderate" | "developing" }>;

function band(pct: number): "strong" | "moderate" | "developing" {
  if (pct >= 0.7) return "strong";
  if (pct >= 0.4) return "moderate";
  return "developing";
}

export function scoreAptitude(responses: Record<string, string>, items: AptitudeItem[]): AptitudeResult {
  const acc: Record<string, { raw: number; total: number }> = {};
  for (const item of items) {
    const a = (acc[item.dimension] ??= { raw: 0, total: 0 });
    a.total += 1;
    if (item.correctOptionId && responses[item.id] === item.correctOptionId) a.raw += 1;
  }
  const out: AptitudeResult = {};
  for (const [dim, { raw, total }] of Object.entries(acc)) {
    out[dim] = { raw, total, band: band(total === 0 ? 0 : raw / total) };
  }
  return out;
}
```
- [ ] **Step 10:** run → PASS. Commit.

- [ ] **Step 11 (marks) — failing test** `lib/__tests__/scoring-marks.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { processMarks } from "@/lib/assessment/scoring/marks";

describe("processMarks", () => {
  it("keeps board/stream and ranks subject strengths desc", () => {
    const r = processMarks({ board: "CBSE", stream: "science", subjects: { Physics: 92, Math: 88, English: 70 } });
    expect(r.board).toBe("CBSE");
    expect(r.strengths).toEqual(["Physics", "Math", "English"]);
  });
});
```
Implement `lib/assessment/scoring/marks.ts`:
```ts
export type MarksInput = { board: string; stream: string; subjects: Record<string, number> };
export type MarksProfile = MarksInput & { strengths: string[] };

export function processMarks(input: MarksInput): MarksProfile {
  const strengths = Object.entries(input.subjects)
    .sort(([, a], [, b]) => b - a)
    .map(([s]) => s);
  return { ...input, strengths };
}
```
Run → PASS. Commit.

- [ ] **Step 12 (confidence) — failing test** `lib/__tests__/scoring-confidence.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { computeConfidence } from "@/lib/assessment/scoring/confidence";

describe("computeConfidence", () => {
  it("flags low when a self-report module is straight-lined", () => {
    const r = computeConfidence({ interests: { q1: "a", q2: "a", q3: "a", q4: "a" } });
    expect(r).toBe("low");
  });
  it("returns high for varied responses", () => {
    const r = computeConfidence({ interests: { q1: "a", q2: "b", q3: "c", q4: "a" } });
    expect(r).toBe("high");
  });
});
```
Implement `lib/assessment/scoring/confidence.ts`:
```ts
type Responses = { interests?: Record<string, string>; work_style?: Record<string, string> };

function straightLined(answers?: Record<string, string>): boolean {
  if (!answers) return false;
  const vals = Object.values(answers);
  return vals.length >= 4 && new Set(vals).size === 1;
}

export function computeConfidence(responses: Responses): "high" | "moderate" | "low" {
  const flags = [straightLined(responses.interests), straightLined(responses.work_style)].filter(Boolean).length;
  if (flags >= 1) return "low";
  return "high";
}
```
Run → PASS. Commit.

- [ ] **Step 13: aggregator** `lib/assessment/scoring/index.ts`:
```ts
import { scoreInterests, type Riasec, type ScoringItem } from "./interests";
import { scoreWorkStyle } from "./work-style";
import { scoreAptitude, type AptitudeItem, type AptitudeResult } from "./aptitude";
import { processMarks, type MarksInput, type MarksProfile } from "./marks";
import { computeConfidence } from "./confidence";

export type AssessmentResponses = {
  interests?: Record<string, string>;
  work_style?: Record<string, string>;
  aptitude?: Record<string, string>;
  marks?: MarksInput;
};
export type ItemsByModule = { interests: ScoringItem[]; work_style: ScoringItem[]; aptitude: AptitudeItem[] };
export type ScoredProfile = {
  interestData: Riasec;
  workStyleScores: Record<string, number>;
  aptitudeScores: AptitudeResult;
  marks: MarksProfile | null;
  confidence: "high" | "moderate" | "low";
};

export function scoreAssessment(r: AssessmentResponses, items: ItemsByModule): ScoredProfile {
  return {
    interestData: scoreInterests(r.interests ?? {}, items.interests),
    workStyleScores: scoreWorkStyle(r.work_style ?? {}, items.work_style),
    aptitudeScores: scoreAptitude(r.aptitude ?? {}, items.aptitude),
    marks: r.marks ? processMarks(r.marks) : null,
    confidence: computeConfidence(r),
  };
}
```
Run `pnpm check` (all scoring tests green). Commit the aggregator + work-style + any uncommitted scorers.

---

## Task 3: Starter item seed for work-style + aptitude

So all 4 modules have content to test (interests seeded in Plan 1). Reuse the Plan 1 seed pipeline (`seedItems`) + CLI.

- [ ] Create `db/seed/items/ipip-workstyle.starter.json` — ~6 IPIP-derived work-style items (module `work_style`, dimensions like `Analytical`/`PeopleOriented`, 5-point Likert, `scoringMap` per option → trait weight, `source: "IPIP"`, license noted). 
- [ ] Create `db/seed/items/aptitude-text.starter.json` — ~8 **text** aptitude items across `numerical`/`verbal`/`logical` (no figural/spatial images in this starter), each with `correctOptionId`, `source: "AUTHORED"` (human-reviewed; figural/ICAR/NTA items are an operational follow-up).
- [ ] Run `pnpm seed:question-bank db/seed/items/ipip-workstyle.starter.json` and `pnpm seed:question-bank db/seed/items/aptitude-text.starter.json`; verify inserts + idempotency on re-run.
- [ ] Commit the two JSON files → `feat(seed): starter work-style (IPIP) + text aptitude items`

---

## Task 4: Assessment APIs (start / save / submit)

**INVOKE FIRST:** `vercel-react-best-practices` (route-handler patterns, `await params`). Use `requireStudent()` + `studentErrorResponse()` from Plan 2a on every handler. `runtime = "nodejs"`.

- [ ] **`lib/assessment/items.ts`** — `getActiveItems(module)`:
```ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";

export function getActiveItems(module: "interests" | "work_style" | "aptitude") {
  return db.select().from(questionBank).where(and(eq(questionBank.module, module), eq(questionBank.isActive, true)));
}
```

- [ ] **`app/api/assessment/start/route.ts`** (POST) — resume the student's `in_progress` attempt or create one; return `{ id }`. Guarded by `requireStudent`. Use `db.query.assessments.findFirst({ where: and(eq(studentId), eq(status,"in_progress")) })`; if none, `insert(...).returning({id})`.

- [ ] **`app/api/assessment/[id]/responses/route.ts`** (PATCH) — body `{ module, answers }` (Zod-validated); load the attempt, **verify it belongs to the student** (`assessment.studentId === session.studentId`, else 403) and is `in_progress`; merge into `responses` jsonb (`{ ...existing, [module]: answers }`); save. Return `{ ok: true }`.

- [ ] **`app/api/assessment/[id]/submit/route.ts`** (POST) — guarded + ownership-checked; require all 4 modules present in `responses` (else 400 `incomplete`, list missing); inside `db.transaction`: fetch active items for the 3 question modules (parallel), `scoreAssessment(responses, items)`, update the row with `status: "completed"`, `completedAt`, `interestData`, `workStyleScores`, `aptitudeScores`, `marks`, `knownStream` (from responses.marks.stream), `confidence`. Also set `students.lastAssessmentAt = now()`. Return `{ id, confidence }`.

- [ ] **Delete** `app/api/assessment/submit/route.ts` (the 501 stub). Search for references first; there should be none after the UI uses the new routes.

- [ ] Each step: `pnpm typecheck && pnpm lint` clean; scoped commit per route (or one commit for the API set): `feat(assessment): start/save/submit APIs (student-guarded, deterministic scoring)`.

> Full handler code for each route follows the exact `requireStudent` try/catch + Zod-validate + `await params` pattern from Plan 2a's routes and Plan 1's admin routes — the implementer writes them mirroring those, and must verify ownership (`studentId` match) on the `[id]` routes.

---

## Task 5: Assessment UI (landing + 4 modules + captured-profile)

**INVOKE FIRST:** `vercel-react-best-practices` AND `shadcn` (project is on the shadcn baseline). Follow `components/student/*` patterns. Apply these specific rules from the React skill:
- Server components fetch the in-progress attempt + active items **in parallel** (`Promise.all`) — `server-parallel-fetching`, `async-parallel`.
- The aptitude timer's ticking value lives in a **ref**, not state (`rerender-use-ref-transient-values`); only re-render on whole-second display via a throttled update.
- Use `startTransition` for save/resume navigation (`rerender-transitions`); don't define components inside components (`rerender-no-inline-components`).
- `next/dynamic` for the heaviest module if bundle grows (`bundle-dynamic-imports`).

Contracts:
- `app/(student)/assessment/page.tsx` (server component, replaces the ComingSoon stub): get `requireStudent()`; fetch the student's latest attempt; if a `completed` one exists show the captured-profile summary; else show Start/Resume → links into the flow. Fetch active item counts per module in parallel for a progress indicator.
- Flow + module components under `components/student/assessment/`: a client `AssessmentFlow` drives module order (Interests → Work-style → Aptitude → Marks); each module renders its items (forced-choice / Likert for self-report; timed MCQ for aptitude; subject-mark inputs + board + stream select for marks); on each module complete, PATCH `/api/assessment/[id]/responses`; final module → POST submit → captured-profile.
- Captured-profile view: render the **Brain Profile** (RIASEC bars, work-style traits, aptitude bands strong/moderate/developing, marks strengths) + a note: "Your course recommendations are coming next." (Plan 3 adds clusters→courses→institutes here.)

- [ ] Build the server landing + the client flow + the 4 module components + the captured-profile view, applying the rules above.
- [ ] Verify `pnpm check` green and `pnpm build` compiles (standalone-symlink EPERM is environmental). Manual smoke: log in → start → complete all 4 → see the captured profile; refresh mid-flow → resume.
- [ ] Commit the UI: `feat(assessment): 4-module assessment flow + captured Brain Profile`

---

## Self-Review

**Spec coverage (§4 assessment, §8.2 schema):** 4-module flow + order (Task 5) ✓ · save/resume via `responses`+`status` (Tasks 1,4,5) ✓ · must-complete-all (Task 4 submit guard) ✓ · per-lens scoring + confidence (Task 2) ✓ · forced-choice/integrity + careless detection (Tasks 2,5) ✓ · marks raw + board-aware, no normalization (Task 2 `processMarks` keeps raw + ranks intra-student) ✓ · account-gated (Plan 2a) ✓. **Deferred (Plan 3):** recommendation engine (gate→cluster→course), result screen clusters/courses, retake-cooldown enforcement, percentile benchmarking. Captured-profile shows scores only, with a "recommendations next" note.

**Placeholder scan:** Task 4 route bodies + Task 5 UI are specified as contracts + key code rather than full listings, because they (a) mirror existing Plan 1/2a route patterns exactly and (b) are UI that the implementer must build against `shadcn` + the live `vercel-react-best-practices` guidance. All scoring + schema + seed steps have complete code. The implementer must invoke the named skills before these tasks.

**Type consistency:** `ScoringItem`/`AptitudeItem` (Task 2) ↔ `question_bank` rows (have `dimension`/`scoringMap`/`correctOptionId`) ↔ `getActiveItems` (Task 4). `AssessmentResponses`/`ScoredProfile` (Task 2 aggregator) ↔ the `responses` jsonb + the score columns (Task 1) ↔ the submit handler (Task 4). `knownStream` (Task 1) ← `responses.marks.stream`.

**Risk note:** Task 1 column renames (empty table) + Task 4 transaction-scoped scoring + ownership checks are the correctness-sensitive spots; the implement→review loop + `pnpm check` cover them.

---

## Execution Handoff

Plan 2b complete. After this lands, **Plan 3** turns the stored profile into the recommendation + result screen (gate → per-cluster match → ranked courses → institutes), replacing the captured-profile note with the real result.
