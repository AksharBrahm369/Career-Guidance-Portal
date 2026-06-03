# Profiling Engine — Plan 1: Data Foundation + Admin Tooling

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data layer and admin tooling the profiling engine needs — formalized career clusters (with target profiles + weights), structured course eligibility, question-bank provenance, and a validated, versioned question-bank seeding pipeline — all manageable from the admin panel.

**Architecture:** Extend the existing Drizzle schema (`db/schema/*`) with a new `career_clusters` table and additive columns on `courses` and `question_bank`; rename the stale `innate` enum value to `work_style`. Add a Zod-validated item-import + idempotent seed loader in `lib/admin/question-bank/`. Expose admin CRUD via `app/api/admin/*` route handlers (guarded by `requireAdmin`, audited via `logAudit`) and thin admin pages under `app/(admin)/admin/*`. No student-facing code and no scoring engine in this plan.

**Tech Stack:** Next.js 15 (App Router) · Drizzle ORM + Postgres · Zod · Vitest (tests live in `lib/**/*.test.ts`, node env, `server-only` aliased to a stub) · pnpm.

**Spec:** [`docs/superpowers/specs/2026-06-03-profiling-engine-design.md`](../specs/2026-06-03-profiling-engine-design.md) (§8 data model, §9 sourcing).

**Done when:** migrations apply cleanly (`pnpm db:migrate`, `pnpm db:check` green); an admin can create/edit career clusters (target profile + per-lens weights), set structured eligibility on a course, and seed + browse/toggle question-bank items; `pnpm check` passes.

---

## File Structure

**Schema (create/modify):**
- `db/schema/enums.ts` (modify) — rename `assessment_module` value `innate` → `work_style`.
- `db/schema/career-clusters.ts` (create) — new `career_clusters` table.
- `db/schema/courses.ts` (modify) — add `requiredSubjects`, `eligibility` columns.
- `db/schema/question-bank.ts` (modify) — add `source`, `license`, `version`, `poolGroup`, `media`.
- `db/schema/index.ts` (modify) — re-export `career-clusters`.
- `drizzle/00NN_*.sql` (generated, committed) — one migration per schema task.

**Seeding pipeline (create):**
- `lib/admin/question-bank/item-schema.ts` — Zod schemas for importable items, per lens.
- `lib/admin/question-bank/seed-loader.ts` — validate + idempotent versioned upsert.
- `lib/admin/clusters/cluster-schema.ts` — Zod schema for cluster definitions.
- `db/seed/clusters.ts` — starter career-cluster definitions (data).
- `db/seed/items/onet-interests.starter.json` — reviewed starter interest items (data).
- `scripts/seed-question-bank.ts` — CLI entry that runs the loader.
- `scripts/seed-clusters.ts` — CLI entry that seeds clusters.

**Admin API (create/modify):**
- `app/api/admin/clusters/route.ts` — `GET` list, `POST` create.
- `app/api/admin/clusters/[id]/route.ts` — `PATCH` update.
- `app/api/admin/question-bank/route.ts` — `GET` list (filter by module/active).
- `app/api/admin/question-bank/[id]/route.ts` — `PATCH` toggle `isActive`.
- `app/api/admin/courses/[id]/route.ts` (modify) — accept eligibility fields in `PATCH`.

**Admin UI (create/modify):**
- `app/(admin)/admin/clusters/page.tsx` — list + create/edit clusters.
- `components/admin/cluster-form.tsx` — cluster editor (profile + weights).
- `app/(admin)/admin/question-bank/page.tsx` — item list + activate/deactivate.
- `components/admin/manual-course-form.tsx` (modify) — add eligibility fields.

**Tests (create):**
- `lib/__tests__/item-schema.test.ts`
- `lib/__tests__/seed-loader.test.ts`
- `lib/__tests__/cluster-schema.test.ts`

---

## Task 1: Rename `assessment_module` enum value `innate` → `work_style`

The lens model dropped "innate" (Multiple-Intelligences) for "work_style". `question_bank` is empty, so a Postgres `RENAME VALUE` is safe.

**Files:**
- Modify: `db/schema/enums.ts`
- Create: `drizzle/00NN_*_work_style_enum.sql` (generated, then hand-verified)

- [ ] **Step 1: Edit the enum**

In `db/schema/enums.ts`, change:

```ts
export const assessmentModule = pgEnum("assessment_module", [
  "aptitude",
  "innate",
  "interests",
]);
```

to:

```ts
export const assessmentModule = pgEnum("assessment_module", [
  "aptitude",
  "interests",
  "work_style",
]);
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file under `drizzle/` is created referencing `assessment_module`.

- [ ] **Step 3: Replace generated SQL with a safe RENAME**

drizzle-kit may emit a drop/recreate. Open the generated `drizzle/00NN_*.sql` and replace its body with the non-destructive rename:

```sql
ALTER TYPE "public"."assessment_module" RENAME VALUE 'innate' TO 'work_style';
```

- [ ] **Step 4: Apply and verify no drift**

Run: `pnpm db:migrate && pnpm db:check`
Expected: migration applies; `db:check` reports no drift.

- [ ] **Step 5: Commit**

```bash
git add db/schema/enums.ts drizzle/
git commit -m "feat(db): rename assessment_module 'innate' -> 'work_style'"
```

---

## Task 2: Create the `career_clusters` table

Formalizes clusters (today only free-text tags on `courses`) with a target profile and per-lens weights.

**Files:**
- Create: `db/schema/career-clusters.ts`
- Modify: `db/schema/index.ts`
- Create: `drizzle/00NN_*_career_clusters.sql` (generated)

- [ ] **Step 1: Create the schema file**

Create `db/schema/career-clusters.ts`:

```ts
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Target profile a student's lens scores are matched against, and the
 * per-cluster lens weights used by the recommendation engine (Plan 3).
 * Shapes are intentionally open jsonb so the engine can evolve weights
 * without a migration; admin tooling validates them with Zod.
 */
export type ClusterTargetProfile = {
  interests: Record<string, number>; // RIASEC key -> 0..1 emphasis
  aptitude: Record<string, number>; // sub-ability key -> 0..1 emphasis
  workStyle: Record<string, number>; // trait key -> 0..1 emphasis
};

export type ClusterLensWeights = {
  interests: number;
  aptitude: number;
  marks: number;
  workStyle: number;
};

export const careerClusters = pgTable(
  "career_clusters",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    key: text("key").notNull().unique(), // matches courses.careerClusters tags
    name: text("name").notNull(),
    description: text("description"),
    targetProfile: jsonb("target_profile").$type<ClusterTargetProfile>().notNull(),
    lensWeights: jsonb("lens_weights").$type<ClusterLensWeights>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("career_clusters_active_idx").on(t.active),
  }),
);

export type CareerCluster = typeof careerClusters.$inferSelect;
export type NewCareerCluster = typeof careerClusters.$inferInsert;
```

- [ ] **Step 2: Re-export from the schema barrel**

In `db/schema/index.ts`, add (keep alphabetical-ish with the others):

```ts
export * from "./career-clusters";
```

- [ ] **Step 3: Generate, apply, verify**

Run: `pnpm db:generate && pnpm db:migrate && pnpm db:check`
Expected: `career_clusters` table created; no drift.

- [ ] **Step 4: Commit**

```bash
git add db/schema/career-clusters.ts db/schema/index.ts drizzle/
git commit -m "feat(db): add career_clusters table (target profile + lens weights)"
```

---

## Task 3: Add structured eligibility to `courses`

Powers the engine's non-compensatory eligibility gate. Additive columns; the existing free-text `eligibilityCriteria` stays for display.

**Files:**
- Modify: `db/schema/courses.ts`
- Create: `drizzle/00NN_*_course_eligibility.sql` (generated)

- [ ] **Step 1: Add the columns**

In `db/schema/courses.ts`, add inside the `courses` table definition (after `entranceExams`):

```ts
    requiredSubjects: text("required_subjects").array().notNull().default(sql`ARRAY[]::text[]`),
    eligibility: jsonb("eligibility").$type<{
      minAggregate?: number; // percent
      minBySubject?: Record<string, number>; // subject -> min percent
      requiredStreamSubjects?: string[];
      entranceExams?: string[];
    }>(),
```

(`jsonb` is already imported in this file via `drizzle-orm/pg-core`? If not, add `jsonb` to the import from `drizzle-orm/pg-core`.)

- [ ] **Step 2: Generate, apply, verify**

Run: `pnpm db:generate && pnpm db:migrate && pnpm db:check`
Expected: two columns added to `courses`; no drift.

- [ ] **Step 3: Commit**

```bash
git add db/schema/courses.ts drizzle/
git commit -m "feat(db): add structured eligibility (required_subjects, eligibility) to courses"
```

---

## Task 4: Add provenance + pooling + media to `question_bank`

Supports versioned master-seed data, randomized item pools, and figural (image) items.

**Files:**
- Modify: `db/schema/question-bank.ts`
- Create: `drizzle/00NN_*_question_bank_provenance.sql` (generated)

- [ ] **Step 1: Add the columns**

In `db/schema/question-bank.ts`, add inside the table (after `scoringMap`):

```ts
    source: text("source").notNull().default("authored"), // e.g. ONET_IP | IPIP | ICAR | SANDIA | NTA | authored
    license: text("license"),
    version: integer("version").notNull().default(1),
    poolGroup: text("pool_group"), // items in the same group are interchangeable in a randomized draw
    media: jsonb("media").$type<{ stem?: string; options?: Record<string, string> }>(), // image URLs for figural items
```

Add `integer` to the `drizzle-orm/pg-core` import in this file.

- [ ] **Step 2: Generate, apply, verify**

Run: `pnpm db:generate && pnpm db:migrate && pnpm db:check`
Expected: five columns added; no drift.

- [ ] **Step 3: Commit**

```bash
git add db/schema/question-bank.ts drizzle/
git commit -m "feat(db): add source/license/version/poolGroup/media to question_bank"
```

---

## Task 5: Item-import Zod schema (per-lens validation)

Validates items before they touch the DB. Aptitude items must carry an answer key; interests/work-style must carry a scoring map.

**Files:**
- Create: `lib/admin/question-bank/item-schema.ts`
- Test: `lib/__tests__/item-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/item-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ImportItem } from "@/lib/admin/question-bank/item-schema";

const base = { dimension: "numerical", questionText: "2 + 2 = ?", options: [{ id: "a", text: "3" }, { id: "b", text: "4" }] };

describe("ImportItem", () => {
  it("accepts an aptitude item with a correct option", () => {
    const r = ImportItem.safeParse({ ...base, module: "aptitude", correctOptionId: "b", source: "SANDIA" });
    expect(r.success).toBe(true);
  });

  it("rejects an aptitude item missing the answer key", () => {
    const r = ImportItem.safeParse({ ...base, module: "aptitude", source: "SANDIA" });
    expect(r.success).toBe(false);
  });

  it("rejects an aptitude item whose correctOptionId is not an option id", () => {
    const r = ImportItem.safeParse({ ...base, module: "aptitude", correctOptionId: "z", source: "SANDIA" });
    expect(r.success).toBe(false);
  });

  it("requires a scoringMap for interests items", () => {
    const ok = ImportItem.safeParse({ ...base, module: "interests", scoringMap: { a: { R: 1 } }, source: "ONET_IP" });
    const bad = ImportItem.safeParse({ ...base, module: "interests", source: "ONET_IP" });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `pnpm test item-schema`
Expected: FAIL — cannot import `ImportItem` (module not found).

- [ ] **Step 3: Implement the schema**

Create `lib/admin/question-bank/item-schema.ts`:

```ts
import { z } from "zod";

const Option = z.object({ id: z.string().min(1), text: z.string().min(1) });

const Common = z.object({
  dimension: z.string().min(1),
  questionText: z.string().min(1),
  options: z.array(Option).min(2),
  source: z.string().min(1),
  license: z.string().optional(),
  version: z.number().int().positive().default(1),
  poolGroup: z.string().optional(),
  media: z.object({ stem: z.string().optional(), options: z.record(z.string()).optional() }).optional(),
});

const Aptitude = Common.extend({
  module: z.literal("aptitude"),
  correctOptionId: z.string().min(1),
}).refine((i) => i.options.some((o) => o.id === i.correctOptionId), {
  message: "correctOptionId must match one of the option ids",
  path: ["correctOptionId"],
});

const SelfReport = Common.extend({
  module: z.enum(["interests", "work_style"]),
  // optionId -> dimension/trait -> weight
  scoringMap: z.record(z.record(z.number())),
});

export const ImportItem = z.discriminatedUnion("module", [Aptitude, SelfReport]);
export type ImportItem = z.infer<typeof ImportItem>;
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test item-schema`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/admin/question-bank/item-schema.ts lib/__tests__/item-schema.test.ts
git commit -m "feat(seed): add Zod item-import schema with per-lens validation"
```

---

## Task 6: Seed loader (validate + idempotent versioned upsert)

Loads validated items into `question_bank`. Idempotent on `(source, dimension, questionText, version)` so re-running a seed file does not duplicate rows.

**Files:**
- Create: `lib/admin/question-bank/seed-loader.ts`
- Test: `lib/__tests__/seed-loader.test.ts`

- [ ] **Step 1: Write the failing test (pure mapping function)**

The loader splits into a pure `toInsertRows(items)` (unit-tested) and a thin DB writer (integration, run via the CLI in Task 8). Create `lib/__tests__/seed-loader.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toInsertRows } from "@/lib/admin/question-bank/seed-loader";

describe("toInsertRows", () => {
  it("maps a valid aptitude item to a question_bank row", () => {
    const rows = toInsertRows([
      {
        module: "aptitude",
        dimension: "numerical",
        questionText: "2 + 2 = ?",
        options: [{ id: "a", text: "3" }, { id: "b", text: "4" }],
        correctOptionId: "b",
        source: "SANDIA",
        version: 1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ module: "aptitude", correctOptionId: "b", source: "SANDIA", isActive: true });
    expect(rows[0]?.scoringMap).toBeNull();
  });

  it("throws on an invalid item (missing answer key)", () => {
    expect(() =>
      toInsertRows([{ module: "aptitude", dimension: "numerical", questionText: "x", options: [{ id: "a", text: "1" }, { id: "b", text: "2" }], source: "SANDIA" } as never]),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `pnpm test seed-loader`
Expected: FAIL — `toInsertRows` not found.

- [ ] **Step 3: Implement the loader**

Create `lib/admin/question-bank/seed-loader.ts`:

```ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questionBank, type NewQuestion } from "@/db/schema";
import { ImportItem } from "./item-schema";

/** Pure: validate + map import items to question_bank insert rows. Throws on the first invalid item. */
export function toInsertRows(items: unknown[]): NewQuestion[] {
  return items.map((raw, i) => {
    const parsed = ImportItem.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Item ${i} invalid: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }
    const item = parsed.data;
    return {
      module: item.module,
      dimension: item.dimension,
      questionText: item.questionText,
      options: item.options,
      correctOptionId: item.module === "aptitude" ? item.correctOptionId : null,
      scoringMap: item.module === "aptitude" ? null : item.scoringMap,
      source: item.source,
      license: item.license ?? null,
      version: item.version ?? 1,
      poolGroup: item.poolGroup ?? null,
      media: item.media ?? null,
      isActive: true,
    } satisfies NewQuestion;
  });
}

/** Idempotent upsert: skips an item if a row with the same (source, dimension, questionText, version) exists. */
export async function seedItems(items: unknown[]): Promise<{ inserted: number; skipped: number }> {
  const rows = toInsertRows(items);
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const existing = await db
      .select({ id: questionBank.id })
      .from(questionBank)
      .where(
        and(
          eq(questionBank.source, row.source!),
          eq(questionBank.dimension, row.dimension),
          eq(questionBank.questionText, row.questionText),
          eq(questionBank.version, row.version!),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(questionBank).values(row);
    inserted++;
  }
  return { inserted, skipped };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test seed-loader`
Expected: PASS (2 tests). (`server-only` is aliased to a stub by `vitest.config.ts`, so the import is fine.)

- [ ] **Step 5: Commit**

```bash
git add lib/admin/question-bank/seed-loader.ts lib/__tests__/seed-loader.test.ts
git commit -m "feat(seed): add question-bank seed loader (pure mapping + idempotent upsert)"
```

---

## Task 7: Cluster definition schema + starter cluster data

**Files:**
- Create: `lib/admin/clusters/cluster-schema.ts`
- Create: `db/seed/clusters.ts`
- Test: `lib/__tests__/cluster-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/cluster-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

const valid = {
  key: "engineering-technology",
  name: "Engineering & Technology",
  targetProfile: { interests: { I: 0.9, R: 0.7 }, aptitude: { numerical: 0.8, spatial: 0.7 }, workStyle: { Analytical: 0.8 } },
  lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
};

describe("ClusterDefinition", () => {
  it("accepts a valid cluster", () => {
    expect(ClusterDefinition.safeParse(valid).success).toBe(true);
  });

  it("rejects lens weights that do not sum to ~1", () => {
    const bad = { ...valid, lensWeights: { interests: 0.5, aptitude: 0.5, marks: 0.5, workStyle: 0.5 } };
    expect(ClusterDefinition.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty key", () => {
    expect(ClusterDefinition.safeParse({ ...valid, key: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `pnpm test cluster-schema`
Expected: FAIL — `ClusterDefinition` not found.

- [ ] **Step 3: Implement the schema**

Create `lib/admin/clusters/cluster-schema.ts`:

```ts
import { z } from "zod";

const WeightMap = z.record(z.number().min(0).max(1));

export const ClusterDefinition = z.object({
  key: z.string().min(1).regex(/^[a-z0-9-]+$/, "key must be kebab-case"),
  name: z.string().min(1),
  description: z.string().optional(),
  targetProfile: z.object({
    interests: WeightMap,
    aptitude: WeightMap,
    workStyle: WeightMap,
  }),
  lensWeights: z
    .object({
      interests: z.number().min(0).max(1),
      aptitude: z.number().min(0).max(1),
      marks: z.number().min(0).max(1),
      workStyle: z.number().min(0).max(1),
    })
    .refine((w) => Math.abs(w.interests + w.aptitude + w.marks + w.workStyle - 1) < 0.001, {
      message: "lens weights must sum to 1",
    }),
});

export type ClusterDefinition = z.infer<typeof ClusterDefinition>;
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test cluster-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: Create starter cluster data**

Create `db/seed/clusters.ts` (3 starter clusters; expand later with experts):

```ts
import type { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

export const STARTER_CLUSTERS: ClusterDefinition[] = [
  {
    key: "engineering-technology",
    name: "Engineering & Technology",
    targetProfile: { interests: { I: 0.9, R: 0.7 }, aptitude: { numerical: 0.8, spatial: 0.7, logical: 0.8 }, workStyle: { Analytical: 0.8, Structured: 0.6 } },
    lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
  },
  {
    key: "healthcare-life-sciences",
    name: "Healthcare & Life Sciences",
    targetProfile: { interests: { I: 0.9, S: 0.6 }, aptitude: { verbal: 0.6, logical: 0.7 }, workStyle: { PeopleOriented: 0.6, Structured: 0.7 } },
    lensWeights: { interests: 0.3, aptitude: 0.25, marks: 0.35, workStyle: 0.1 },
  },
  {
    key: "commerce-management",
    name: "Commerce & Management",
    targetProfile: { interests: { E: 0.8, C: 0.7 }, aptitude: { numerical: 0.7, verbal: 0.6 }, workStyle: { PeopleOriented: 0.6, Structured: 0.6 } },
    lensWeights: { interests: 0.35, aptitude: 0.2, marks: 0.3, workStyle: 0.15 },
  },
];
```

- [ ] **Step 6: Commit**

```bash
git add lib/admin/clusters/cluster-schema.ts db/seed/clusters.ts lib/__tests__/cluster-schema.test.ts
git commit -m "feat(seed): add cluster definition schema + starter clusters"
```

---

## Task 8: Seed CLI scripts + reviewed starter interest items

Proves the pipeline end-to-end with a small, human-reviewed interest item set (O*NET-derived). Aptitude/figural seeding is an operational follow-up using the same pipeline.

**Files:**
- Create: `db/seed/items/onet-interests.starter.json`
- Create: `scripts/seed-question-bank.ts`
- Create: `scripts/seed-clusters.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Add reviewed starter items**

Create `db/seed/items/onet-interests.starter.json` (3 examples; the real file holds the reviewed O*NET set):

```json
[
  { "module": "interests", "dimension": "R", "questionText": "Build kitchen cabinets", "options": [{"id":"1","text":"Strongly dislike"},{"id":"2","text":"Dislike"},{"id":"3","text":"Unsure"},{"id":"4","text":"Like"},{"id":"5","text":"Strongly like"}], "scoringMap": {"1":{"R":1},"2":{"R":2},"3":{"R":3},"4":{"R":4},"5":{"R":5}}, "source": "ONET_IP", "license": "O*NET Career Exploration Tools License" },
  { "module": "interests", "dimension": "I", "questionText": "Develop a new medicine", "options": [{"id":"1","text":"Strongly dislike"},{"id":"2","text":"Dislike"},{"id":"3","text":"Unsure"},{"id":"4","text":"Like"},{"id":"5","text":"Strongly like"}], "scoringMap": {"1":{"I":1},"2":{"I":2},"3":{"I":3},"4":{"I":4},"5":{"I":5}}, "source": "ONET_IP", "license": "O*NET Career Exploration Tools License" },
  { "module": "interests", "dimension": "A", "questionText": "Write books or plays", "options": [{"id":"1","text":"Strongly dislike"},{"id":"2","text":"Dislike"},{"id":"3","text":"Unsure"},{"id":"4","text":"Like"},{"id":"5","text":"Strongly like"}], "scoringMap": {"1":{"A":1},"2":{"A":2},"3":{"A":3},"4":{"A":4},"5":{"A":5}}, "source": "ONET_IP", "license": "O*NET Career Exploration Tools License" }
]
```

- [ ] **Step 2: Write the question-bank seed CLI**

Create `scripts/seed-question-bank.ts` (mirrors `scripts/create-admin.ts`'s dotenv + tsx style):

```ts
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { seedItems } from "../lib/admin/question-bank/seed-loader";

async function main() {
  const path = process.argv[2] ?? "db/seed/items/onet-interests.starter.json";
  const items = JSON.parse(await readFile(path, "utf8")) as unknown[];
  const { inserted, skipped } = await seedItems(items);
  console.log(`✓ Seeded ${path}: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Write the cluster seed CLI**

Create `scripts/seed-clusters.ts`:

```ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { careerClusters } from "../db/schema";
import { STARTER_CLUSTERS } from "../db/seed/clusters";

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const c of STARTER_CLUSTERS) {
    const existing = await db.query.careerClusters.findFirst({ where: eq(careerClusters.key, c.key) });
    if (existing) { skipped++; continue; }
    await db.insert(careerClusters).values({
      key: c.key, name: c.name, description: c.description ?? null,
      targetProfile: c.targetProfile, lensWeights: c.lensWeights,
    });
    inserted++;
  }
  console.log(`✓ Clusters: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => { console.error("✗ Cluster seed failed:", err); process.exit(1); });
```

- [ ] **Step 4: Add package.json scripts**

In `package.json` `scripts`, add:

```json
    "seed:clusters": "tsx -r tsconfig-paths/register scripts/seed-clusters.ts",
    "seed:question-bank": "tsx -r tsconfig-paths/register scripts/seed-question-bank.ts",
```

- [ ] **Step 5: Run both seeds against the local DB**

Run: `pnpm seed:clusters && pnpm seed:question-bank`
Expected: `✓ Clusters: 3 inserted, 0 skipped` and `✓ Seeded …: 3 inserted, 0 skipped`. Re-running shows `0 inserted, N skipped` (idempotent).

- [ ] **Step 6: Commit**

```bash
git add db/seed/ scripts/seed-question-bank.ts scripts/seed-clusters.ts package.json
git commit -m "feat(seed): add seed CLIs + reviewed starter interest items & clusters"
```

---

## Task 9: Admin API — clusters list/create/update

**Files:**
- Create: `app/api/admin/clusters/route.ts`
- Create: `app/api/admin/clusters/[id]/route.ts`

- [ ] **Step 1: Implement `GET` list + `POST` create**

Create `app/api/admin/clusters/route.ts` (follows the `requireAdmin`/`adminErrorResponse`/`logAudit` pattern from `app/api/admin/fetch/route.ts`):

```ts
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const rows = await db.select().from(careerClusters).orderBy(careerClusters.name);
  return Response.json({ clusters: rows });
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  let body;
  try {
    body = ClusterDefinition.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  const [created] = await db
    .insert(careerClusters)
    .values({
      key: body.key, name: body.name, description: body.description ?? null,
      targetProfile: body.targetProfile, lensWeights: body.lensWeights,
    })
    .returning({ id: careerClusters.id });
  await logAudit({ adminId: admin.adminId, action: "create", entityType: "career_cluster", entityId: created?.id, newValues: { key: body.key } });
  return Response.json({ id: created?.id }, { status: 201 });
}
```

- [ ] **Step 2: Implement `PATCH` update**

Create `app/api/admin/clusters/[id]/route.ts`:

```ts
import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;
  let body;
  try {
    body = ClusterDefinition.partial().parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  await db.update(careerClusters).set({ ...body, updatedAt: new Date() }).where(eq(careerClusters.id, id));
  await logAudit({ adminId: admin.adminId, action: "update", entityType: "career_cluster", entityId: id, newValues: body });
  return Response.json({ ok: true });
}
```

> Note: the `audit_action` and `entityType` columns are free text / existing enums — `entityType` is a `text` field per `lib/audit.ts`, so `"career_cluster"` needs no migration. `action` reuses existing `create`/`update` enum values.

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/clusters/
git commit -m "feat(admin): cluster list/create/update API (requireAdmin + audit)"
```

---

## Task 10: Admin API — accept eligibility in course PATCH

**Files:**
- Modify: `app/api/admin/courses/[id]/route.ts`

- [ ] **Step 1: Extend the PATCH body schema**

In `app/api/admin/courses/[id]/route.ts`, locate the Zod `PatchBody` schema and add these optional fields:

```ts
  requiredSubjects: z.array(z.string()).optional(),
  eligibility: z
    .object({
      minAggregate: z.number().min(0).max(100).optional(),
      minBySubject: z.record(z.number().min(0).max(100)).optional(),
      requiredStreamSubjects: z.array(z.string()).optional(),
      entranceExams: z.array(z.string()).optional(),
    })
    .optional(),
```

The existing handler already spreads validated fields into the `update().set(...)`; confirm `requiredSubjects` and `eligibility` flow through (they are now valid columns from Task 3). No other change needed.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/courses/
git commit -m "feat(admin): accept structured eligibility in course PATCH"
```

---

## Task 11: Admin API — question-bank list + toggle

**Files:**
- Create: `app/api/admin/question-bank/route.ts`
- Create: `app/api/admin/question-bank/[id]/route.ts`

- [ ] **Step 1: Implement `GET` list (filter by module + active)**

Create `app/api/admin/question-bank/route.ts`:

```ts
import { and, eq, type SQL } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const url = new URL(req.url);
  const moduleParam = url.searchParams.get("module");
  const conds: SQL[] = [];
  if (moduleParam === "aptitude" || moduleParam === "interests" || moduleParam === "work_style") {
    conds.push(eq(questionBank.module, moduleParam));
  }
  const rows = await db
    .select()
    .from(questionBank)
    .where(conds.length ? and(...conds) : undefined)
    .limit(500);
  return Response.json({ items: rows });
}
```

- [ ] **Step 2: Implement `PATCH` toggle `isActive`**

Create `app/api/admin/question-bank/[id]/route.ts`:

```ts
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
const Body = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  await db.update(questionBank).set({ isActive: body.isActive }).where(eq(questionBank.id, id));
  await logAudit({ adminId: admin.adminId, action: "update", entityType: "question_bank_item", entityId: id, newValues: { isActive: body.isActive } });
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/question-bank/
git commit -m "feat(admin): question-bank list + activate/deactivate API"
```

---

## Task 12: Admin UI — clusters page, question-bank page, eligibility fields

These are server components + a client form, mirroring existing admin pages (e.g., `app/(admin)/admin/catalogue/page.tsx`, `components/admin/manual-course-form.tsx`). UI is verified manually (no vitest UI tests in this repo).

**Files:**
- Create: `app/(admin)/admin/clusters/page.tsx`
- Create: `components/admin/cluster-form.tsx`
- Create: `app/(admin)/admin/question-bank/page.tsx`
- Modify: `components/admin/manual-course-form.tsx`

- [ ] **Step 1: Clusters list page (server component)**

Create `app/(admin)/admin/clusters/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { ClusterForm } from "@/components/admin/cluster-form";

export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  const clusters = await db.select().from(careerClusters).orderBy(careerClusters.name);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Career Clusters</h1>
      <ClusterForm />
      <ul className="divide-y rounded-md border">
        {clusters.map((c) => (
          <li key={c.id} className="p-3 text-sm">
            <span className="font-medium">{c.name}</span>{" "}
            <span className="text-muted-foreground">({c.key})</span>
            <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
              weights: {JSON.stringify(c.lensWeights)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Cluster create form (client component)**

Create `components/admin/cluster-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ClusterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [json, setJson] = useState(
    '{\n  "key": "engineering-technology",\n  "name": "Engineering & Technology",\n  "targetProfile": {"interests":{"I":0.9},"aptitude":{"numerical":0.8},"workStyle":{"Analytical":0.8}},\n  "lensWeights": {"interests":0.3,"aptitude":0.3,"marks":0.3,"workStyle":0.1}\n}',
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const res = await fetch("/api/admin/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail ?? data.error ?? `HTTP ${res.status}`);
      return;
    }
    setError(null);
    start(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <label className="text-sm font-medium">New cluster (JSON)</label>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={8}
        className="rounded-md border bg-background p-2 font-mono text-xs"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        onClick={submit}
        disabled={pending}
        className="self-start rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create cluster"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Question-bank review page (server component)**

Create `app/(admin)/admin/question-bank/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const items = await db.select().from(questionBank).limit(500);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Question Bank ({items.length})</h1>
      <ul className="divide-y rounded-md border text-sm">
        {items.map((q) => (
          <li key={q.id} className="flex items-center justify-between gap-3 p-3">
            <span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{q.module}/{q.dimension}</span>{" "}
              {q.questionText}
              <span className="ml-2 text-xs text-muted-foreground">[{q.source} v{q.version}]</span>
            </span>
            <span className={q.isActive ? "text-xs text-green-600" : "text-xs text-muted-foreground"}>
              {q.isActive ? "active" : "inactive"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Add eligibility fields to the manual course form**

In `components/admin/manual-course-form.tsx`, add two controlled inputs that post into the existing course `PATCH`/create payload: a comma-separated **Required subjects** text input mapped to `requiredSubjects: string[]`, and a **Minimum aggregate %** number input mapped to `eligibility.minAggregate`. Wire them into the form's existing submit payload object (the same object already sent to the course API). Keep styling consistent with the form's existing inputs.

- [ ] **Step 5: Manual verification**

Run: `pnpm dev`, log in as an admin (`pnpm create-admin` if needed), then:
- Visit `/admin/clusters` → create a cluster from JSON → it appears in the list.
- Visit `/admin/question-bank` → the 3 seeded interest items show as active.
- Open the manual course form → set required subjects + min aggregate → save → confirm persisted (re-open shows values).

- [ ] **Step 6: Full gate + commit**

Run: `pnpm check`
Expected: typecheck + lint + db:check + test all pass.

```bash
git add app/(admin)/admin/clusters app/(admin)/admin/question-bank components/admin/cluster-form.tsx components/admin/manual-course-form.tsx
git commit -m "feat(admin): clusters + question-bank pages and course eligibility fields"
```

---

## Self-Review

**Spec coverage (§8 data model, §9 sourcing):**
- §8.3 `question_bank` enum `innate`→`work_style` → Task 1. ✓
- §8.4 new `career_clusters` (target profile + weights) → Task 2. ✓
- §8.5 `courses` structured eligibility → Task 3 (+ API Task 10, UI Task 12). ✓
- §8.3 `question_bank` provenance/pool/media → Task 4. ✓
- §8.6 versioned master-seed pipeline → Tasks 5–8. ✓
- §9 sourcing (seed format carries `source`/`license`; figural `media`) → Tasks 4–8. ✓
- Admin management of clusters/weights/eligibility/items → Tasks 9–12. ✓
- **Deferred to later plans (correctly not here):** `assessments` table changes, `students` auth (Plan 2); the scoring engine + result (Plan 3). Noted in §1/§10 of the plan.

**Placeholder scan:** Task 12 Step 4 (eligibility form inputs) is described prose-style rather than full code — it depends on the current shape of `manual-course-form.tsx`'s payload object, which the implementer must read. All other code steps contain complete code. Acceptable: it is a wiring instruction against existing code, not a missing definition.

**Type consistency:** `ImportItem` (Task 5) ↔ `toInsertRows`/`seedItems` (Task 6) use the same fields; `ClusterDefinition` (Task 7) ↔ cluster API (Task 9) ↔ `careerClusters` columns (Task 2) align on `key/name/description/targetProfile/lensWeights`. `module` values are exactly `aptitude | interests | work_style` everywhere (Task 1). `NewQuestion` is the existing `question_bank.$inferInsert` type, extended by Task 4's columns.

---

## Execution Handoff

Plan 1 is complete. Plans 2 (student auth + assessment UI) and 3 (engine + result) follow after this one lands.
