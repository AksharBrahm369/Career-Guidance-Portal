# Profiling Engine — Plan 3: Recommendation Engine + Result Screen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.
> **MANDATORY per the repo golden rules (CLAUDE.md):** before writing code, invoke the matching skill via the Skill tool — **`vercel-react-best-practices`** for any React/Next code (the result screen + the submit route handler), **`shadcn`** for UI. The engine is **deterministic — NEVER call an LLM** (this is the platform invariant; `ai-sdk` is not used here). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn a completed assessment's stored Brain Profile into a deterministic, explainable ranked course shortlist (eligibility gate → cluster match → ranked courses → per-course "why" → catalogue deep-links), computed at submit time and rendered on the result screen — replacing the Plan 2b "recommendations coming next" note.

**Architecture:** A **pure** recommendation library (`lib/recommendation/*`, fully unit-tested, no I/O, no LLM) takes the stored profile + active clusters + published courses and returns `{ clusterScores, recommendedCourses, lowSignal }`. The Plan 2b submit route is extended to load clusters + eligible published courses and persist the engine output on the `assessments` row inside the existing transaction. The result screen (the completed-attempt branch of the assessment page) renders ranked clusters → ranked courses (#1 highlighted) with per-lens reasons and deep-links into the existing catalogue detail pages, plus print-to-PDF.

**Tech Stack (verified current APIs):** Drizzle 0.38 (`jsonb().$type<>()`, `db.transaction`, `db.query.X.findMany`, `inArray`), Next.js 15 (server components, route handlers), React 19 + Tailwind/shadcn tokens, Zod 3.25, Vitest (`lib/**/*.test.ts`). All scoring is pure TS.

**Spec:** [`docs/superpowers/specs/2026-06-03-profiling-engine-design.md`](../specs/2026-06-03-profiling-engine-design.md) §5 (engine), §6 (result screen), §8.2/§8.4/§8.5 (data model). Build decisions: deterministic hybrid (non-compensatory eligibility gate → compensatory per-cluster weighted match → course ranking); within-student normalization; explainability is the USP; PDF via print stylesheet (no server PDF dep); cross-stream surfaced-with-caveat, not eliminated.

**Done when:** a completed assessment row carries `clusterScores` + `recommendedCourses`; the result screen shows ranked clusters and ranked courses with a clear #1, per-course reasons, and working `/courses/[slug]` deep-links; low-signal and no-match fallbacks behave per §5.7; `pnpm check` green; `pnpm build` compiles (Windows standalone-symlink EPERM is environmental).

---

## Data shapes (shared contract)

Engine input (from the stored `assessments` row + catalogue):
```ts
// lib/recommendation/types.ts
export type RiasecKey = "R" | "I" | "A" | "S" | "E" | "C";

export type StudentProfile = {
  interests: Record<string, number>;   // interestData (raw RIASEC sums)
  workStyle: Record<string, number>;   // workStyleScores (raw trait sums)
  aptitude: Record<string, { raw: number; total: number; band: "strong" | "moderate" | "developing" }>;
  marks: { board: string; stream: string; subjects: Record<string, number>; strengths: string[] } | null;
  knownStream: string | null;
  confidence: "high" | "moderate" | "low" | null;
};

export type ClusterInput = {
  key: string;
  name: string;
  targetProfile: { interests: Record<string, number>; aptitude: Record<string, number>; workStyle: Record<string, number> };
  lensWeights: { interests: number; aptitude: number; marks: number; workStyle: number };
};

export type CourseInput = {
  id: string;
  slug: string;
  courseName: string;
  stream: string;
  careerClusters: string[];           // cluster keys
  requiredSubjects: string[];
  eligibility: { minAggregate?: number; minBySubject?: Record<string, number>; requiredStreamSubjects?: string[]; entranceExams?: string[] } | null;
};

// Outputs (persisted on the assessments row)
export type ClusterScore = { clusterKey: string; name: string; score: number; breakdown: { interests: number; aptitude: number; workStyle: number; marks: number } };
export type CourseRecommendation = { courseId: string; slug: string; courseName: string; clusterKey: string; fitScore: number; crossStream: boolean; reasons: string[] };
export type RecommendationResult = { clusterScores: ClusterScore[]; recommendedCourses: CourseRecommendation[]; lowSignal: boolean };
```

`assessments` new columns:
```ts
clusterScores: jsonb("cluster_scores").$type<ClusterScore[]>(),
recommendedCourses: jsonb("recommended_courses").$type<CourseRecommendation[]>(),
// careerClustersRanked (text[]) already exists — set to the ranked cluster keys.
```

---

## File Structure

- `db/schema/assessments.ts` (modify) — add `clusterScores`, `recommendedCourses` jsonb. Migration `0008`.
- `lib/recommendation/types.ts` (create) — the contract above.
- `lib/recommendation/normalize.ts` (create) — within-student normalization + pattern-match math (pure).
- `lib/recommendation/eligibility.ts` (create) — non-compensatory gate (pure).
- `lib/recommendation/cluster-match.ts` (create) — per-cluster weighted fit (pure).
- `lib/recommendation/course-rank.ts` (create) — course fit + reasons (pure).
- `lib/recommendation/index.ts` (create) — `recommend(profile, clusters, courses)` aggregator.
- Tests: `lib/__tests__/recommend-normalize.test.ts`, `recommend-eligibility.test.ts`, `recommend-cluster.test.ts`, `recommend-course.test.ts`, `recommend-index.test.ts`.
- `lib/recommendation/catalogue.ts` (create) — `getRecommendationInputs()` server query (active clusters + published eligible-shaped courses).
- `db/seed/courses.demo.ts` + `scripts/seed-demo-catalogue.ts` (create) — a small published catalogue (courses + institutes + links) so results are demonstrable; `seed:demo-catalogue` script.
- `app/api/assessment/[id]/submit/route.ts` (modify) — compute + persist recommendations in the transaction.
- `components/student/assessment/captured-profile.tsx` (modify) — render clusters + ranked courses + reasons + deep-links; low-signal/no-match framing; print button.
- `components/student/assessment/result-print.css` or print classes (create) — print stylesheet for PDF.

---

## Task 1: Schema — clusterScores + recommendedCourses

**Files:** `db/schema/assessments.ts`; migration `0008`.

- [ ] **Step 1: Add the columns** — in `db/schema/assessments.ts`, import the engine output types and add after `confidence`:
```ts
import type { ClusterScore, CourseRecommendation } from "@/lib/recommendation/types";
// ...
    clusterScores: jsonb("cluster_scores").$type<ClusterScore[]>(),
    recommendedCourses: jsonb("recommended_courses").$type<CourseRecommendation[]>(),
```
(If importing from `lib` into `db/schema` risks a cycle — `lib/db` imports `db/schema` — instead inline the two array types locally in `assessments.ts` rather than importing. Verify `pnpm typecheck` for a cycle; prefer inlining if unsure.)

- [ ] **Step 2:** `pnpm db:generate`. **drizzle-kit prompts interactively for renames; this migration is pure additive (two new columns) so it should NOT prompt** — if it does, something else drifted; stop and inspect. The generator runs non-interactively for additive changes.
  - ⚠️ If the generator can't run non-interactively in this environment (it needs a TTY for any prompt), hand-author like Plan 2b's `0007`: copy `drizzle/meta/0007_snapshot.json` → `0008_snapshot.json` via a node script (set new `id`, `prevId` = 0007's id, add the two columns to `tables["public.assessments"].columns` in definition order after `confidence`), write `drizzle/0008_<name>.sql` with `ALTER TABLE "assessments" ADD COLUMN "cluster_scores" jsonb;--> statement-breakpoint` + `ADD COLUMN "recommended_courses" jsonb;`, and append the journal entry `{idx:8,version:"7",when:Date.now(),tag:"0008_<name>",breakpoints:true}`.
- [ ] **Step 3:** `pnpm db:migrate && pnpm db:check` → no drift. Verify columns exist (`information_schema.columns` for `assessments`).
- [ ] **Step 4: Commit** `git add db/schema/assessments.ts drizzle/0008_*.sql drizzle/meta/0008_snapshot.json drizzle/meta/_journal.json` → `feat(db): assessments cluster_scores + recommended_courses`

(Scoped-commit rule applies to every task: stage only the listed files; never `git add -A`; parked files `CLAUDE.md`/`.claude/skills/*`/`skills-lock.json`/`.env*` stay untouched.)

---

## Task 2: Engine — normalization + pattern-match (pure, TDD)

**INVOKE FIRST:** none (pure TS); follow TDD.

**Files:** `lib/recommendation/types.ts`, `lib/recommendation/normalize.ts`; test `lib/__tests__/recommend-normalize.test.ts`.

- [ ] **Step 1:** create `lib/recommendation/types.ts` with the full contract from the "Data shapes" section above (copy it verbatim).

- [ ] **Step 2: Failing test** `lib/__tests__/recommend-normalize.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { normalizeByMax, normalizeAptitude, marksAggregate, patternMatch } from "@/lib/recommendation/normalize";

describe("normalizeByMax", () => {
  it("scales the largest value to 1 and others proportionally", () => {
    expect(normalizeByMax({ R: 5, I: 10, A: 0 })).toEqual({ R: 0.5, I: 1, A: 0 });
  });
  it("returns zeros unchanged when all are zero", () => {
    expect(normalizeByMax({ R: 0, I: 0 })).toEqual({ R: 0, I: 0 });
  });
});

describe("normalizeAptitude", () => {
  it("converts raw/total into a 0..1 proportion per sub-ability", () => {
    const out = normalizeAptitude({ numerical: { raw: 3, total: 4, band: "strong" }, verbal: { raw: 0, total: 0, band: "developing" } });
    expect(out.numerical).toBeCloseTo(0.75);
    expect(out.verbal).toBe(0);
  });
});

describe("marksAggregate", () => {
  it("returns the mean percentage on a 0..1 scale", () => {
    expect(marksAggregate({ board: "CBSE", stream: "science", subjects: { Physics: 80, Math: 100 }, strengths: [] })).toBeCloseTo(0.9);
  });
  it("returns 0 for null/empty marks", () => {
    expect(marksAggregate(null)).toBe(0);
  });
});

describe("patternMatch", () => {
  it("is 1 for perfectly aligned vectors over the target's keys", () => {
    expect(patternMatch({ I: 1, R: 0.5, A: 0.2 }, { I: 1, R: 0.5 })).toBeCloseTo(1);
  });
  it("is 0 when the student has no signal on the target's keys", () => {
    expect(patternMatch({ A: 1 }, { I: 1, R: 0.5 })).toBe(0);
  });
});
```

- [ ] **Step 3:** run → FAIL. **Step 4:** implement `lib/recommendation/normalize.ts`:
```ts
import type { StudentProfile } from "./types";

/** Scale a weight map so its largest value becomes 1 (within-student, §5.2). */
export function normalizeByMax(m: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(m));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) out[k] = max === 0 ? v : v / max;
  return out;
}

/** Aptitude sub-abilities as 0..1 proportions (raw/total). */
export function normalizeAptitude(a: StudentProfile["aptitude"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, { raw, total }] of Object.entries(a)) out[k] = total > 0 ? raw / total : 0;
  return out;
}

/** Mean subject percentage on a 0..1 scale; 0 when no marks. */
export function marksAggregate(marks: StudentProfile["marks"]): number {
  const vals = Object.values(marks?.subjects ?? {});
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length / 100;
}

/** Cosine similarity restricted to the target's keys (0..1 for non-negative vectors). */
export function patternMatch(student: Record<string, number>, target: Record<string, number>): number {
  const keys = Object.keys(target);
  if (keys.length === 0) return 0;
  let dot = 0, sumT = 0, sumS = 0;
  for (const k of keys) {
    const s = student[k] ?? 0;
    const t = target[k];
    dot += s * t; sumT += t * t; sumS += s * s;
  }
  if (sumS === 0 || sumT === 0) return 0;
  return dot / (Math.sqrt(sumS) * Math.sqrt(sumT));
}
```

- [ ] **Step 5:** run → PASS. **Step 6:** commit `lib/recommendation/types.ts` + `normalize.ts` + test → `feat(recommend): within-student normalization + pattern-match`

---

## Task 3: Engine — eligibility gate (pure, TDD)

**Files:** `lib/recommendation/eligibility.ts`; test `lib/__tests__/recommend-eligibility.test.ts`.

Gate is **non-compensatory** (§5.3): hard subject/marks constraints eliminate a course. Stream mismatch does **not** eliminate (§5.7 — surface cross-stream with caveat); it sets `crossStream: true`.

- [ ] **Step 1: Failing test** `lib/__tests__/recommend-eligibility.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "@/lib/recommendation/eligibility";
import type { CourseInput, StudentProfile } from "@/lib/recommendation/types";

const student: StudentProfile = {
  interests: {}, workStyle: {}, aptitude: {},
  marks: { board: "CBSE", stream: "science", subjects: { Physics: 80, Chemistry: 70, Mathematics: 90 }, strengths: [] },
  knownStream: "science", confidence: "high",
};
const base: CourseInput = { id: "c1", slug: "btech", courseName: "B.Tech", stream: "science", careerClusters: ["engineering-technology"], requiredSubjects: ["Mathematics"], eligibility: null };

describe("evaluateEligibility", () => {
  it("passes an in-stream course with met constraints", () => {
    const r = evaluateEligibility(student, { ...base, eligibility: { minAggregate: 70, requiredStreamSubjects: ["Mathematics"] } });
    expect(r.eligible).toBe(true);
    expect(r.crossStream).toBe(false);
  });
  it("eliminates when a required stream subject is missing", () => {
    const r = evaluateEligibility(student, { ...base, eligibility: { requiredStreamSubjects: ["Biology"] } });
    expect(r.eligible).toBe(false);
  });
  it("eliminates when the aggregate is below the minimum", () => {
    const r = evaluateEligibility(student, { ...base, eligibility: { minAggregate: 95 } });
    expect(r.eligible).toBe(false);
  });
  it("flags cross-stream but stays eligible", () => {
    const r = evaluateEligibility({ ...student, knownStream: "commerce" }, base);
    expect(r.eligible).toBe(true);
    expect(r.crossStream).toBe(true);
  });
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement `lib/recommendation/eligibility.ts`:
```ts
import { marksAggregate } from "./normalize";
import type { CourseInput, StudentProfile } from "./types";

export type EligibilityResult = { eligible: boolean; crossStream: boolean; reasons: string[] };

export function evaluateEligibility(student: StudentProfile, course: CourseInput): EligibilityResult {
  const reasons: string[] = [];
  const subjects = student.marks?.subjects ?? {};
  const elig = course.eligibility;

  // Hard: required stream subjects must be present in the student's marks.
  for (const s of elig?.requiredStreamSubjects ?? []) {
    if (subjects[s] == null) return { eligible: false, crossStream: false, reasons: [`Requires ${s}, which you didn't report`] };
  }
  // Hard: per-subject minimums.
  for (const [s, min] of Object.entries(elig?.minBySubject ?? {})) {
    if ((subjects[s] ?? -1) < min) return { eligible: false, crossStream: false, reasons: [`Needs at least ${min}% in ${s}`] };
  }
  // Hard: aggregate minimum (board-aware reference; raw, no normalization).
  if (elig?.minAggregate != null && marksAggregate(student.marks) * 100 < elig.minAggregate) {
    return { eligible: false, crossStream: false, reasons: [`Needs about ${elig.minAggregate}% aggregate`] };
  }

  const crossStream = student.knownStream != null && course.stream !== student.knownStream;
  if (crossStream) reasons.push(`Cross-stream from ${student.knownStream} — check the entrance route`);
  return { eligible: true, crossStream, reasons };
}
```

- [ ] **Step 4:** run → PASS. **Step 5:** commit → `feat(recommend): non-compensatory eligibility gate`

---

## Task 4: Engine — cluster matching (pure, TDD)

**Files:** `lib/recommendation/cluster-match.ts`; test `lib/__tests__/recommend-cluster.test.ts`.

Cluster fit (§5.4) = `wI·patternMatch(interestsNorm,target.interests) + wA·patternMatch(aptitudeNorm,target.aptitude) + wW·patternMatch(workStyleNorm,target.workStyle) + wMarks·marksAggregate`. Weights sum to 1, each term ∈ [0,1] → score ∈ [0,1].

- [ ] **Step 1: Failing test** `lib/__tests__/recommend-cluster.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { scoreClusters } from "@/lib/recommendation/cluster-match";
import type { ClusterInput, StudentProfile } from "@/lib/recommendation/types";

const eng: ClusterInput = {
  key: "engineering-technology", name: "Engineering & Technology",
  targetProfile: { interests: { I: 1, R: 0.7 }, aptitude: { numerical: 1 }, workStyle: { Analytical: 1 } },
  lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
};
const arts: ClusterInput = {
  key: "arts-design", name: "Arts & Design",
  targetProfile: { interests: { A: 1 }, aptitude: { verbal: 1 }, workStyle: { Creative: 1 } },
  lensWeights: { interests: 0.4, aptitude: 0.2, marks: 0.25, workStyle: 0.15 },
};
const student: StudentProfile = {
  interests: { I: 10, R: 6 }, workStyle: { Analytical: 5 },
  aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
  marks: { board: "CBSE", stream: "science", subjects: { Physics: 90 }, strengths: ["Physics"] },
  knownStream: "science", confidence: "high",
};

describe("scoreClusters", () => {
  it("ranks the aligned cluster above the misaligned one", () => {
    const ranked = scoreClusters(student, [eng, arts]);
    expect(ranked[0].clusterKey).toBe("engineering-technology");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
  it("returns a per-lens breakdown and a 0..1 score", () => {
    const [top] = scoreClusters(student, [eng]);
    expect(top.score).toBeGreaterThan(0);
    expect(top.score).toBeLessThanOrEqual(1);
    expect(top.breakdown).toHaveProperty("interests");
    expect(top.breakdown).toHaveProperty("marks");
  });
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement `lib/recommendation/cluster-match.ts`:
```ts
import { marksAggregate, normalizeAptitude, normalizeByMax, patternMatch } from "./normalize";
import type { ClusterInput, ClusterScore, StudentProfile } from "./types";

export function scoreClusters(student: StudentProfile, clusters: ClusterInput[]): ClusterScore[] {
  const interestsNorm = normalizeByMax(student.interests);
  const workStyleNorm = normalizeByMax(student.workStyle);
  const aptitudeNorm = normalizeAptitude(student.aptitude);
  const marksSig = marksAggregate(student.marks);

  return clusters
    .map((c) => {
      const iM = patternMatch(interestsNorm, c.targetProfile.interests);
      const aM = patternMatch(aptitudeNorm, c.targetProfile.aptitude);
      const wM = patternMatch(workStyleNorm, c.targetProfile.workStyle);
      const breakdown = {
        interests: c.lensWeights.interests * iM,
        aptitude: c.lensWeights.aptitude * aM,
        workStyle: c.lensWeights.workStyle * wM,
        marks: c.lensWeights.marks * marksSig,
      };
      const score = breakdown.interests + breakdown.aptitude + breakdown.workStyle + breakdown.marks;
      return { clusterKey: c.key, name: c.name, score, breakdown };
    })
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4:** run → PASS. **Step 5:** commit → `feat(recommend): per-cluster weighted matching`

---

## Task 5: Engine — course ranking + reasons + aggregator (pure, TDD)

**Files:** `lib/recommendation/course-rank.ts`, `lib/recommendation/index.ts`; tests `lib/__tests__/recommend-course.test.ts`, `recommend-index.test.ts`.

Course fit (§5.5): for each eligible course, base on the score of its best-matching ranked cluster, blended with a course-specific subject-marks signal; cross-stream applies a penalty; reasons are generated per-lens. Tie-break: fitScore desc, then subject signal, then cluster score.

- [ ] **Step 1: Failing test** `lib/__tests__/recommend-course.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { rankCourses } from "@/lib/recommendation/course-rank";
import type { ClusterScore, CourseInput, StudentProfile } from "@/lib/recommendation/types";

const student: StudentProfile = {
  interests: { I: 10 }, workStyle: { Analytical: 5 },
  aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
  marks: { board: "CBSE", stream: "science", subjects: { Mathematics: 90, Physics: 80 }, strengths: ["Mathematics", "Physics"] },
  knownStream: "science", confidence: "high",
};
const clusterScores: ClusterScore[] = [
  { clusterKey: "engineering-technology", name: "Engineering & Technology", score: 0.8, breakdown: { interests: 0.3, aptitude: 0.3, workStyle: 0.1, marks: 0.1 } },
];
const courses: CourseInput[] = [
  { id: "c1", slug: "btech-cse", courseName: "B.Tech CSE", stream: "science", careerClusters: ["engineering-technology"], requiredSubjects: ["Mathematics"], eligibility: { requiredStreamSubjects: ["Mathematics"] } },
  { id: "c2", slug: "ba-eng", courseName: "BA English", stream: "arts", careerClusters: ["arts-design"], requiredSubjects: [], eligibility: null },
];

describe("rankCourses", () => {
  it("ranks an eligible in-cluster course above one with no matching cluster", () => {
    const out = rankCourses(student, clusterScores, courses);
    expect(out[0].slug).toBe("btech-cse");
    expect(out[0].fitScore).toBeGreaterThan(0);
    expect(out[0].reasons.length).toBeGreaterThan(0);
  });
  it("excludes courses eliminated by the eligibility gate", () => {
    const blocked: CourseInput = { id: "c3", slug: "mbbs", courseName: "MBBS", stream: "science", careerClusters: ["engineering-technology"], requiredSubjects: [], eligibility: { requiredStreamSubjects: ["Biology"] } };
    const out = rankCourses(student, clusterScores, [blocked]);
    expect(out.find((r) => r.slug === "mbbs")).toBeUndefined();
  });
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement `lib/recommendation/course-rank.ts`:
```ts
import { evaluateEligibility } from "./eligibility";
import type { ClusterScore, CourseInput, CourseRecommendation, StudentProfile } from "./types";

const RIASEC_LABEL: Record<string, string> = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };

function subjectSignal(student: StudentProfile, course: CourseInput): number {
  const subs = student.marks?.subjects ?? {};
  const rel = course.requiredSubjects.map((s) => subs[s]).filter((v): v is number => v != null);
  if (rel.length === 0) {
    const all = Object.values(subs);
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length / 100 : 0;
  }
  return rel.reduce((a, b) => a + b, 0) / rel.length / 100;
}

function buildReasons(student: StudentProfile, course: CourseInput, cluster: ClusterScore, crossStream: boolean): string[] {
  const reasons: string[] = [];
  const topInterest = Object.entries(student.interests).sort(([, a], [, b]) => b - a)[0]?.[0];
  if (topInterest) reasons.push(`Matches your ${RIASEC_LABEL[topInterest] ?? topInterest} interest`);
  const strongApt = Object.entries(student.aptitude).find(([, v]) => v.band === "strong")?.[0];
  if (strongApt) reasons.push(`Backed by strong ${strongApt} aptitude`);
  const relSub = course.requiredSubjects.find((s) => (student.marks?.subjects ?? {})[s] != null);
  if (relSub) reasons.push(`Your ${relSub} marks (${student.marks!.subjects[relSub]}%) fit`);
  reasons.push(`Strong fit for the ${cluster.name} cluster`);
  if (crossStream) reasons.push(`Note: cross-stream from ${student.knownStream} — check the entrance route`);
  return reasons;
}

export function rankCourses(student: StudentProfile, clusterScores: ClusterScore[], courses: CourseInput[]): CourseRecommendation[] {
  const scoreByKey = new Map(clusterScores.map((c) => [c.clusterKey, c]));
  const out: CourseRecommendation[] = [];

  for (const course of courses) {
    const elig = evaluateEligibility(student, course);
    if (!elig.eligible) continue;
    // Best matching ranked cluster for this course.
    let best: ClusterScore | undefined;
    for (const key of course.careerClusters) {
      const cs = scoreByKey.get(key);
      if (cs && (!best || cs.score > best.score)) best = cs;
    }
    if (!best) continue; // no recommendable cluster context
    const subSig = subjectSignal(student, course);
    let fit01 = 0.7 * best.score + 0.3 * subSig;
    if (elig.crossStream) fit01 *= 0.85;
    out.push({
      courseId: course.id,
      slug: course.slug,
      courseName: course.courseName,
      clusterKey: best.clusterKey,
      fitScore: Math.round(Math.max(0, Math.min(1, fit01)) * 100),
      crossStream: elig.crossStream,
      reasons: buildReasons(student, course, best, elig.crossStream),
    });
  }

  return out.sort((a, b) => b.fitScore - a.fitScore || Number(a.crossStream) - Number(b.crossStream));
}
```

- [ ] **Step 4:** run → PASS. Commit `course-rank.ts` + test → `feat(recommend): course ranking + per-lens reasons`.

- [ ] **Step 5: Aggregator test** `lib/__tests__/recommend-index.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/recommendation";
import type { ClusterInput, CourseInput, StudentProfile } from "@/lib/recommendation/types";

const clusters: ClusterInput[] = [{
  key: "engineering-technology", name: "Engineering & Technology",
  targetProfile: { interests: { I: 1 }, aptitude: { numerical: 1 }, workStyle: { Analytical: 1 } },
  lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
}];
const courses: CourseInput[] = [{ id: "c1", slug: "btech", courseName: "B.Tech", stream: "science", careerClusters: ["engineering-technology"], requiredSubjects: ["Mathematics"], eligibility: null }];

describe("recommend", () => {
  it("returns ranked clusters + courses and a lowSignal flag", () => {
    const profile: StudentProfile = {
      interests: { I: 10, R: 2 }, workStyle: { Analytical: 5 },
      aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
      marks: { board: "CBSE", stream: "science", subjects: { Mathematics: 90 }, strengths: ["Mathematics"] },
      knownStream: "science", confidence: "high",
    };
    const r = recommend(profile, clusters, courses);
    expect(r.clusterScores[0].clusterKey).toBe("engineering-technology");
    expect(r.recommendedCourses[0].slug).toBe("btech");
    expect(typeof r.lowSignal).toBe("boolean");
  });
  it("flags lowSignal when cluster scores barely differ or confidence is low", () => {
    const flat: StudentProfile = { interests: {}, workStyle: {}, aptitude: {}, marks: null, knownStream: "science", confidence: "low" };
    const r = recommend(flat, clusters, courses);
    expect(r.lowSignal).toBe(true);
  });
});
```

- [ ] **Step 6:** implement `lib/recommendation/index.ts`:
```ts
import { scoreClusters } from "./cluster-match";
import { rankCourses } from "./course-rank";
import type { ClusterInput, CourseInput, RecommendationResult, StudentProfile } from "./types";

const LOW_SIGNAL_SPREAD = 0.08; // top-vs-bottom cluster spread below this = undifferentiated
const MAX_COURSES = 10;

export function recommend(profile: StudentProfile, clusters: ClusterInput[], courses: CourseInput[]): RecommendationResult {
  const clusterScores = scoreClusters(profile, clusters);
  const recommendedCourses = rankCourses(profile, clusterScores, courses).slice(0, MAX_COURSES);

  const top = clusterScores[0]?.score ?? 0;
  const bottom = clusterScores[clusterScores.length - 1]?.score ?? 0;
  const lowSignal =
    profile.confidence === "low" ||
    clusterScores.length === 0 ||
    top - bottom < LOW_SIGNAL_SPREAD ||
    recommendedCourses.length === 0;

  return { clusterScores, recommendedCourses, lowSignal };
}

export type { RecommendationResult } from "./types";
```

- [ ] **Step 7:** run `pnpm check` (all recommend tests green). Commit `index.ts` + test → `feat(recommend): recommendation aggregator + low-signal detection`.

---

## Task 6: Demo published catalogue seed (so results are demonstrable)

The DB currently has **0 courses**. The engine is unit-tested with fixtures, but the result screen + end-to-end need published courses (with eligibility + cluster keys) and institutes. Seed a small, realistic, India-relevant set across the 3 seeded clusters + streams.

**Files:** `db/seed/courses.demo.ts`, `scripts/seed-demo-catalogue.ts`; `package.json` script `seed:demo-catalogue`.

- [ ] **Step 1:** create `db/seed/courses.demo.ts` exporting ~6–8 published courses (status `"published"`, a valid `source`, `aiSafetyTag`, `tenureYears`, `description`, `eligibilityCriteria`) spanning `engineering-technology` / `healthcare-life-sciences` / `commerce-management`, each with `careerClusters` (matching seeded keys), `requiredSubjects`, and structured `eligibility` (e.g. B.Tech → `{ requiredStreamSubjects: ["Mathematics"], minAggregate: 60 }`, MBBS → `{ requiredStreamSubjects: ["Biology"], minAggregate: 70, entranceExams: ["NEET"] }`, B.Com → `{ minAggregate: 50 }`). Include 2–3 institutes and `course_institutes` links so deep-links land on populated detail pages.
- [ ] **Step 2:** create `scripts/seed-demo-catalogue.ts` (mirror `scripts/seed-clusters.ts`: `import "dotenv/config"` semantics via the existing tsx invocation, idempotent upsert by `slug`/institute name using `onConflictDoNothing`, insert `course_institutes` links). Add to `package.json`: `"seed:demo-catalogue": "tsx -r tsconfig-paths/register --import ./scripts/stubs/register-server-only.mjs scripts/seed-demo-catalogue.ts"`.
- [ ] **Step 3:** run `pnpm seed:clusters` (ensure clusters present) then `pnpm seed:demo-catalogue`; verify rows insert and re-run is idempotent (0 inserted second time). Confirm via a count query.
- [ ] **Step 4: Commit** `git add db/seed/courses.demo.ts scripts/seed-demo-catalogue.ts package.json` → `feat(seed): demo published catalogue (courses + institutes) for recommendations`

> Note in the commit body: this is **dev/demo seed data**, not authoritative catalogue content — production courses come through the admin fetch→review→publish flow.

---

## Task 7: Wire the engine into submit (compute + persist)

**INVOKE FIRST:** `vercel-react-best-practices` (route-handler patterns).

**Files:** `lib/recommendation/catalogue.ts` (create), `app/api/assessment/[id]/submit/route.ts` (modify).

- [ ] **Step 1:** create `lib/recommendation/catalogue.ts`:
```ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { careerClusters, courses } from "@/db/schema";
import type { ClusterInput, CourseInput } from "./types";

/** Active clusters + published courses, shaped for the pure engine. */
export async function getRecommendationInputs(): Promise<{ clusters: ClusterInput[]; courses: CourseInput[] }> {
  const [clusterRows, courseRows] = await Promise.all([
    db.select().from(careerClusters).where(eq(careerClusters.active, true)),
    db.select().from(courses).where(eq(courses.status, "published")),
  ]);
  return {
    clusters: clusterRows.map((c) => ({ key: c.key, name: c.name, targetProfile: c.targetProfile, lensWeights: c.lensWeights })),
    courses: courseRows.map((c) => ({
      id: c.id, slug: c.slug, courseName: c.courseName, stream: c.stream,
      careerClusters: c.careerClusters, requiredSubjects: c.requiredSubjects, eligibility: c.eligibility ?? null,
    })),
  };
}
```

- [ ] **Step 2:** in `app/api/assessment/[id]/submit/route.ts`, after `scoreAssessment(...)` and before/within the transaction: build the `StudentProfile` from the freshly-scored `profile` (interestData → interests, workStyleScores → workStyle, aptitudeScores → aptitude, profile.marks → marks, responses.marks.stream → knownStream, profile.confidence → confidence), call `getRecommendationInputs()`, run `recommend(...)`, and persist into the same `tx.update(assessments)` call:
```ts
import { getRecommendationInputs } from "@/lib/recommendation/catalogue";
import { recommend } from "@/lib/recommendation";
// ... after scoreAssessment:
const { clusters, courses } = await getRecommendationInputs();
const rec = recommend(
  {
    interests: profile.interestData,
    workStyle: profile.workStyleScores,
    aptitude: profile.aptitudeScores,
    marks: profile.marks,
    knownStream: profile.marks?.stream ?? null,
    confidence: profile.confidence,
  },
  clusters,
  courses,
);
// inside tx.update(assessments).set({ ... existing fields ...,
//   clusterScores: rec.clusterScores,
//   recommendedCourses: rec.recommendedCourses,
//   careerClustersRanked: rec.clusterScores.map((c) => c.clusterKey),
// })
```
Return `{ id, confidence: profile.confidence, lowSignal: rec.lowSignal }`.

- [ ] **Step 3:** `pnpm typecheck && pnpm lint` clean. Integration smoke (like Plan 2b): a throwaway tsx script that seeds an attempt with complete responses, calls the submit logic path (or directly `getRecommendationInputs()` + `recommend()` against the seeded demo catalogue), and asserts `recommendedCourses` is non-empty with a #1. Delete the script after.
- [ ] **Step 4: Commit** `git add lib/recommendation/catalogue.ts "app/api/assessment/[id]/submit/route.ts"` → `feat(assessment): compute + persist recommendations on submit`

---

## Task 8: Result screen (clusters → ranked courses → why → deep-links + PDF)

**INVOKE FIRST:** `vercel-react-best-practices` AND `shadcn`.

**Files:** `components/student/assessment/captured-profile.tsx` (modify), and the assessment page server component (`app/(student)/assessment/page.tsx`) to pass the new data; optional `components/student/assessment/recommendation-list.tsx` if the file grows.

The completed-attempt branch already renders the Brain Profile (Plan 2b). Extend it per §6 order: **Brain Profile → ranked Clusters → ranked Courses (#1 highlighted) → per-course why + catalogue deep-links.**

- [ ] **Step 1:** in `app/(student)/assessment/page.tsx`, when the latest attempt is `completed`, pass `latest.clusterScores ?? []`, `latest.recommendedCourses ?? []`, and a `lowSignal` derivation (e.g., recompute from `confidence`/spread, or store it — simplest: treat `confidence === "low"` OR empty `recommendedCourses` as low-signal in the view) to `CapturedProfile`.
- [ ] **Step 2:** in `captured-profile.tsx`, add below the Brain Profile:
  - **Ranked clusters:** top clusters with a fit bar (reuse the `BarList` pattern; show `Math.round(score*100)`).
  - **Ranked courses:** the `recommendedCourses` list; **#1 visually highlighted** (border-primary, "Top match" chip). Each card shows `courseName`, `fitScore` (e.g., "82% fit"), `reasons` (the per-lens "why"), a `crossStream` caveat badge when set, and a `Link href={\`/courses/${slug}\`}` deep-link ("View course & institutes").
  - **Low-signal framing (§5.7):** if low-signal, replace the confident "#1" treatment with "These are broad directions to explore" + a "retake when ready" note; do not bold a single winner.
  - **No-match fallback (§5.7):** if `recommendedCourses` is empty, show honest best-available framing + a "talk to a counselor" nudge + a link to browse the full catalogue. Never a silent dead-end.
  - **Print/PDF:** a "Download as PDF" button (client island or `window.print()` trigger) + a print stylesheet/`print:` Tailwind classes hiding nav/buttons so the on-screen result prints cleanly (§6 "downloadable PDF" via browser print — no server PDF dep in v1).
- [ ] **Step 3:** `pnpm check` green; `pnpm build` compiles (standalone EPERM is environmental). Manual smoke: complete an assessment for a student whose marks/stream match a seeded course → see ranked clusters + a highlighted #1 course → click through to `/courses/[slug]`.
- [ ] **Step 4: Commit** `git add components/student/assessment/ "app/(student)/assessment/page.tsx"` → `feat(assessment): recommendation result screen (clusters, ranked courses, why, deep-links, PDF)`

---

## Self-Review

**Spec coverage:** §5.1 pipeline (Tasks 2–5 + 7) ✓ · §5.2 within-student normalization (Task 2) ✓ · §5.3 non-compensatory gate (Task 3) ✓ · §5.4 per-cluster weighted match (Task 4) ✓ · §5.5 course ranking + #1 + tie-break (Task 5) ✓ · §5.6 explainability/per-lens reasons + inspectable weights (Task 5; weights already admin-tunable from Plan 1) ✓ · §5.7 edge cases: cross-stream surfaced-with-caveat (Tasks 3,5,8), low-signal/flat detection + framing (Tasks 5,8), no-match fallback (Task 8) ✓ · §6 result screen order + per-course why + deep-links + PDF (Task 8) ✓ · §8.2 new columns (Task 1) ✓ · persistence at completion (Task 7) ✓. **Deferred (per spec §2/§10):** percentile benchmarking, marks verification, weight auto-tuning/ML, i18n, parent view, share links, class 9–10 flow, rule-based item generators. Retake-cooldown enforcement (§7) already has the data (`lastAssessmentAt` set on submit in Plan 2b; `cooldownOverride` exists) — gate UI/route is a small follow-up, noted but out of this plan's core.

**Placeholder scan:** Tasks 2–5 (the deterministic core) have complete code + tests. Task 1 (schema) follows Plan 2b's exact migration approach. Tasks 6–8 are specified as contracts + key code mirroring existing Plan 1/2a/2b patterns (seed pipeline, route handler, server-component + shadcn UI) — the implementer invokes the named skills and follows the established files.

**Type consistency:** `StudentProfile`/`ClusterInput`/`CourseInput`/`ClusterScore`/`CourseRecommendation`/`RecommendationResult` (Task 2 types.ts) are used identically across normalize/eligibility/cluster-match/course-rank/index (Tasks 2–5), the persisted columns (Task 1), the catalogue query (Task 7), and the result screen (Task 8). `recommend(profile, clusters, courses)` signature matches its call site in the submit route.

**Risk note:** Task 1 migration (additive; reuse the 0007 hand-author fallback if the generator needs a TTY), Task 7 transaction-scoped persistence, and the engine's score-blend constants (`0.7/0.3`, `0.85` cross-stream penalty, `0.08` low-signal spread) are the sensitive spots — the constants are explicit and centralized so admins/tuning can revisit them; the implement→review loop + `pnpm check` cover correctness.

---

## Execution Handoff

After Plan 3 lands, the profiling/recommendation engine is feature-complete per the v1 spec. Remaining spec items are explicitly deferred (§2/§10) plus the small retake-cooldown gate follow-up.
