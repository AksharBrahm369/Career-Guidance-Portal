# Modules — Career Guidance Platform

Per-module reference: what lives where, the contracts at the seams, and the gotchas you only learn after debugging once. Read [`KNOWLEDGE_BASE.md`](./KNOWLEDGE_BASE.md) first for the why.

Order is roughly bottom-up: **Foundation → AI → Admin → Student**.

---

## 1. Environment & config (`lib/env.ts`)

**Owns:** validating + exposing runtime env to every server module.

- Single Zod schema parses `process.env` at module load. Failure throws synchronously — server won't start with bad config.
- Refine() check: the API key for whichever provider `AI_PROVIDER` selects **must** be present.
- Importers: `lib/db`, `lib/auth/*`, `lib/ai/*`, `drizzle.config.ts`.
- Type re-exports: `Env`, `ProviderId`.

> **Rule:** never reach into `process.env` from anywhere else. If you need a new var, add it to `EnvSchema` and re-export through `env`.

---

## 2. Database access (`lib/db/index.ts` + `db/schema/*`)

**Owns:** the Drizzle client + the typed schema.

- `lib/db/index.ts` builds a singleton `Pool` (node-postgres) keyed by `DATABASE_URL` and wraps it in `drizzle()` with `schema` for query DSL + typed select.
- Schema is split per table under `db/schema/`:
  - `enums.ts` — every Postgres enum (status, source, stream, AI safety, audit action, etc.)
  - `admins.ts`, `students.ts` (M4), `institutes.ts`, `courses.ts` (+ `course_institutes`), `assessments.ts`, `question-bank.ts`, `audit-log.ts`
  - `auth.ts` — NextAuth standard tables
  - `relations.ts` — Drizzle `relations()` for join queries
  - `index.ts` re-exports everything so `import { courses, institutes, courseInstitutes, audit_log } from "@/db/schema"` is the one-import surface.

**Important columns to remember:**

```ts
// courses
status: "draft" | "pending_review" | "published" | "archived" | "rejected"
source: "ai_fetch" | "manual"
careerClusters: text[]                        // never null; default []
sourceUrls: text[]                            // ≤ 8 by validation
aiSafetyTag: "ai_safe" | "ai_augmented" | "ai_risk"
aiSafetyTagAi: same enum (the model's original pick, kept for audit)
aiSafetyReasoning: text                       // displayed to students on detail page
publishedAt / fetchedAt / createdAt / updatedAt: timestamptz
rejectionReason: text                         // cleared on reopen
reviewedByAdminId / createdByAdminId / lastEditedByAdminId: uuid -> admins.id
```

```ts
// course_institutes (M2 hotfix tightened this)
courseId    REFERENCES courses(id) ON DELETE CASCADE
instituteId REFERENCES institutes(id) ON DELETE CASCADE
UNIQUE (course_id, institute_id)              // course_institutes_pair_uq
```

---

## 3. Migrations (`drizzle/`, `scripts/migrate.ts`)

- `pnpm db:generate` after editing schema → produces the next `drizzle/00NN_*.sql`.
- `pnpm db:migrate` runs `scripts/migrate.ts` which calls Drizzle's migration runner against `DATABASE_URL`.
- `pnpm db:check` (CI) verifies no schema drift.
- Docker entrypoint runs migrations before launching the app.

**Never** rewrite a shipped migration. To undo, ship a new migration that reverses it.

Current migrations on the branch: `0000_green_lady_bullseye.sql` (initial schema), `0001_tearful_sentry.sql` (M2 hotfix — `ai_safety_reasoning`, `course_institutes` FKs + composite unique).

---

## 4. Auth & RBAC (`lib/auth/*`, `middleware.ts`, `scripts/create-admin.ts`)

| File | Role |
|---|---|
| `lib/auth/config.base.ts` | Shared NextAuth config (callbacks, JWT shape) — used by both edge and node runtimes |
| `lib/auth/config.ts` | Node runtime config — adds Drizzle adapter + credentials provider (scrypt verify) |
| `lib/auth/edge.ts` | Edge runtime config — no DB, no scrypt; for middleware only |
| `lib/auth/index.ts` | Exports `{ auth, handlers, signIn, signOut }` (node) |
| `lib/auth/password.ts` | `hashPassword(plain)` + `verifyPassword(stored, plain)` using `node:crypto` scrypt |
| `lib/auth/require-admin.ts` | Server-side guard: throws `UnauthorizedError` if no admin session |
| `middleware.ts` | Calls edge `auth()`; redirects unauth'd `/admin/*` → `/admin/login` |
| `scripts/create-admin.ts` | CLI to seed an admin row (prompt → hash → insert) |

**Session shape (JWT):**
```ts
session.user = { name, email, role: "admin", adminId: <uuid> }
```

**Pattern for an admin-only API route:**
```ts
let admin;
try {
  admin = await requireAdmin();
} catch (err) {
  return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
}
```

`requireAdmin()` is the only thing API routes should trust for "is this an admin." Don't read `session?.user?.role` directly anywhere else.

---

## 5. AI provider registry (`lib/ai/providers.ts`, `lib/ai/client.ts`)

**Owns:** the one place that knows which model implements which feature.

```ts
PROVIDERS: Record<ProviderId, ProviderSpec> = {
  anthropic: { modelId: "claude-sonnet-4-6",  supportsExplicitCacheControl: true,  build() },
  google:    { modelId: "gemini-2.5-flash",   supportsExplicitCacheControl: false, build() },
  openai:    { modelId: "gpt-4o",             supportsExplicitCacheControl: false, build() },
};
```

- `getModel(feature: "fetch" | "qa")` resolves env (`AI_FETCH_PROVIDER` || `AI_QA_PROVIDER` || `AI_PROVIDER`) to a `ProviderSpec`, asserts its API key is present (throws a friendly error if not), and calls `spec.build()` to instantiate a Vercel AI SDK `LanguageModel`.
- `spec.supportsExplicitCacheControl` lets consumers branch on whether to attach `providerMetadata.anthropic.cacheControl = "ephemeral"`. We use it in the Q&A prompt builder.
- Add a new provider in this one file — features don't change.

---

## 6. Admin AI fetch (`lib/ai/safe-fetch.ts`, `app/api/admin/fetch/route.ts`, `lib/admin/persist-fetched-course.ts`, `lib/slug.ts`)

**Flow:**

```
POST /api/admin/fetch
  → requireAdmin()
  → consume(adminId)  // 10 fetches / 60 s, in-memory bucket
  → safeFetchCourse({ query, excludeNames })
        → generateText() with experimental_output (Zod schema)
        → soft duplicate warning if name > 85% similar to existing
        → verifyUrls(sourceUrls)  // dead dropped, unknown kept
  → persistFetchedCourse(parsed, ctx)  // inside a TX:
        upsert institutes (onConflictDoNothing on slug)
        insert course (status='pending_review', source='ai_fetch')
        link course_institutes (composite unique avoids dup)
        logAudit("ai_fetch")
  → return { courseId, slug, warnings, durationMs }
```

**Files:**

- `lib/ai/safe-fetch.ts`
  - `CourseFetchResult` — Zod schema for the structured AI output (name, stream, clusters, AI safety, eligibility, exams, fees, sources, description, institutes).
  - `SYSTEM_PROMPT` — pinned in this file; deliberately includes the "no duplicates" + "evidence-first" rules.
  - `safeFetchCourse({ query, excludeNames })` returns `{ course, warnings, durationMs }`.
- `lib/admin/persist-fetched-course.ts` — transaction-safe persistence. Uses `onConflictDoNothing({ target: institutes.slug })` + a fallback select to handle two parallel fetches sharing the same institute.
- `lib/slug.ts` — `slugify()` returns 6-char random suffix when input has no ASCII (Devanagari, etc.) so we never emit empty slugs and never collide on `""`.
- `lib/rate-limit.ts` — `consume(key, cfg)` token bucket; admin fetch passes `capacity: 10, refillPerSecond: 10/60`. Returns `{ ok: false, retryAfter }` on miss → HTTP 429.

**UI:** `app/(admin)/admin/fetch/page.tsx` + `components/admin/fetch-manager.tsx` — query input, streaming status, warnings panel, "Add manually instead" link.

---

## 7. Manual course create (`app/(admin)/admin/courses/new`, `components/admin/manual-course-form.tsx`, `POST /api/admin/courses`)

Same downstream pipeline as AI fetch — but the form supplies the values an admin researched by hand. `source = "manual"`, status starts at `"pending_review"`.

The POST handler also runs `verifyUrls()` on the pasted source URLs (dropping dead ones, keeping unknown, surfacing dead links in the response `warnings` array) so manual entries get the same hygiene as AI fetches.

---

## 8. Review queue (`app/(admin)/admin/review`, `components/admin/review-card.tsx`, publish/reject/reopen routes)

**Lists** all `pending_review` courses, paginated 10/page via the shared `<Pagination />` and `listAdminCourses({ status: "pending_review", page, perPage: 10 })`.

**Review card** is the heart of the admin UX:

- **View mode**: AI safety chip + reasoning, eligibility, exams, description, institutes, `SourceUrlsEditor` (read-only with verified/broken/unchecked badges + "Verify all" button).
- **Edit mode**: every text field becomes inputs; `SourceUrlsEditor` switches to add/remove controls; save via `PATCH /api/admin/courses/[id]`.
- **Buttons**: Expand / Edit / Reject (with reason prompt) / Publish (or "Save & Publish" if currently editing).

**Endpoints:**

| Method + path | Validates | DB effect | Audit |
|---|---|---|---|
| `PATCH /api/admin/courses/[id]` | Zod `PatchBody` (optional fields incl. `sourceUrls: z.array(z.string().url()).max(8)`) | partial update | `update` |
| `POST .../publish` | `status === "pending_review"`; required fields (description ≥ 150 chars, eligibility, tenure, clusters) | `pending_review → published`, sets `publishedAt`, `reviewedByAdminId` | `publish` |
| `POST .../reject` | `status === "pending_review"`, body `{ reason: string ≥ 3 chars }` | `pending_review → rejected`, sets `rejectionReason`, `reviewedByAdminId` | `reject` |
| `POST .../reopen` | `status === "rejected"` | `rejected → pending_review`, clears `rejectionReason` + `reviewedByAdminId` | `update` (with `reopened: true`) |

All return HTTP 409 with `{ error: "invalid_transition", from, to }` if the source state doesn't match.

---

## 9. Admin catalogue (`app/(admin)/admin/catalogue`, `lib/admin/courses-list.ts`, `components/admin/course-lifecycle-actions.tsx`, archive/restore routes)

**Unified courses index** — replaces the old "published-only" page.

- **Status tabs** (`Published / Pending review / Rejected / Archived`) driven by `?status=…`. Counts come from a single `count(*) FILTER (WHERE status = …)` rollup → one round-trip for all four.
- **Pagination** — server-side, 20/page via `?page=N`. Uses the shared `<Pagination />`.
- **Order column** picked per tab so "newest first" feels right:
  - `published` → `publishedAt`
  - `pending_review` → `createdAt`
  - `rejected | archived` → `updatedAt`
- **Per-row action** is rendered by `<CourseLifecycleActions courseId status />`:

  | Status | Action button |
  |---|---|
  | `published` | **Archive** (confirm prompt) |
  | `pending_review` | **Open in review** (link to `/admin/review`) |
  | `rejected` | **Reopen for review** (clears reason) |
  | `archived` | **Restore to published** (preserves original `publishedAt` if set, else sets to `now()`) |

- **Rejected rows** also display a truncated `rejectionReason` so the admin sees the *why* without having to dig.

**Service contract** — `listAdminCourses({ status, page, perPage })` returns:

```ts
{
  rows: Course[],
  page: number,
  perPage: number,
  total: number,                // count for the active status only
  pageCount: number,            // Math.max(1, ceil(total/perPage))
  counts: Record<AdminStatus, number>,  // all four, for tab badges
}
```

**Endpoints (the new ones):**

- `POST /api/admin/courses/[id]/archive` — `published → archived` (already shipped in M2)
- `POST /api/admin/courses/[id]/restore` — `archived → published`. Mirrors the publish/archive pattern; if `publishedAt` is null, sets it to `now()`. Audit `publish` + `restored: true`.
- `POST /api/admin/courses/[id]/reopen` — `rejected → pending_review`. Clears `rejectionReason` + `reviewedByAdminId`. Audit `update` + `reopened: true`.

Both 409 on invalid transitions.

---

## 10. Source URL verification (`lib/url-verify.ts`, `/api/admin/courses/[id]/verify-sources`, `components/admin/source-urls-editor.tsx`)

**`lib/url-verify.ts`** — pure-stdlib URL liveness check.

```ts
verifyUrls(urls: string[], opts?: { timeoutMs?: number }):
  Promise<{ ok: string[]; dead: string[]; unknown: string[]; results: UrlResult[] }>
```

**Algorithm per URL:**
1. Validate URL syntax (`new URL(...)`). Invalid → `dead`.
2. HEAD with `AbortSignal.timeout(5000)`, `redirect: "follow"`, friendly User-Agent.
3. If HEAD returns `405` or `501`, retry with GET + `Range: bytes=0-0` (servers that refuse HEAD almost always honor a tiny range request).
4. If HEAD throws (network/timeout), retry once with GET + `Range: bytes=0-0`.
5. Classify: `2xx | 3xx → ok`, `4xx | 5xx → dead`, network/timeout → `unknown`.
6. Close the response body (`res.body.cancel()`) so the socket returns to the pool.

All URLs are checked in parallel via `Promise.all`; the input list is deduped (whitespace-trimmed).

**Used by:**
- `lib/ai/safe-fetch.ts` — after the AI returns. Dead URLs are dropped from `course.sourceUrls`; warnings collected.
- `POST /api/admin/courses` (manual create) — same hygiene on admin-pasted URLs.
- `POST /api/admin/courses/[id]/verify-sources` — on-demand re-check, returns the three buckets *without* modifying the row.

**UI** — `components/admin/source-urls-editor.tsx` (client component):
- Per-URL status badge: `verified` (green) / `broken` (rose) / `unchecked` (muted).
- "Verify all" button calls the on-demand endpoint, updates badges in place.
- In edit mode: per-URL remove + an "Add URL" input. URL validity checked client-side before adding; max 8.
- Save flows through the existing `PATCH /api/admin/courses/[id]` (which now accepts `sourceUrls`).

**Tests:** `lib/__tests__/url-verify.test.ts` — 8 scenarios covering 200, 3xx, 404, 405 → GET fallback, network → GET fallback (recovery + still-failing), invalid URL, dedupe, mixed batch.

---

## 11. Shared pagination (`components/pagination.tsx`)

```tsx
<Pagination
  page={data.page}
  pageCount={data.pageCount}
  hrefForPage={(target) => `/path?page=${target}`}
/>
```

- Renders nothing if `pageCount <= 1`.
- Prev/Next as `Link` components — no JS, fully SSR.
- Used by student `/courses`, `/admin/catalogue`, `/admin/review`.

Building a paginated page = service returns `{ page, pageCount, hrefForPage }`-compatible data → render this. Don't hand-roll prev/next anymore.

---

## 12. Student catalogue (`app/(student)/courses/page.tsx`, `lib/student/courses.ts`, `components/student/{catalogue-filters,course-card}.tsx`)

- **Server component** reads `?q, ?stream, ?ai, ?cluster, ?page` and calls `listPublishedCourses(filters)`.
- **Service** composes `where` from `status='published'` + each optional filter: `ILIKE` on name+description for `q`, exact match on `stream`/`aiSafetyTag`, `arrayOverlaps()` for `cluster`. Returns rows + pagination metadata + per-row institute counts via a second aggregate query.
- **`<CatalogueFilters />`** — client component pushes URL params via `router.push`. Stream / AI safety chips toggle; text input commits on Enter or blur.
- **`<CourseCard />`** — accessible card linking to detail page. AI safety chip color-coded (green/amber/rose).
- **Pagination** — shared component (12/page on the student side).

---

## 13. Course detail (`app/(student)/courses/[slug]/page.tsx`)

- Calls `getPublishedCourseBySlug(slug)` (joins course + linked institutes) and `getRelatedPublishedCourses(excludeId, clusters, limit)` (uses `arrayOverlaps()` on `career_clusters`).
- Sections in order: header (name + chips), description, **AI exposure reasoning panel** (the `aiSafetyReasoning` finally surfaced student-side), key facts grid (eligibility, exams, tenure, fees), institutes table with website links, source URLs (just links — verified status is admin-only), Q&A widget, related courses.
- 404 via `notFound()` if no row.

---

## 14. AI Q&A (`app/api/courses/[id]/qa/route.ts`, `lib/ai/qa-prompt.ts`, `lib/qa-session.ts`, `components/student/qa-chat.tsx`)

**Flow:**

```
POST /api/courses/[id|slug]/qa  (Content-Type: application/json)
body: { message: string, history: { role, content }[] }
  → resolve course (UUID or slug)
  → getOrCreateQASessionId() reads/sets qa_sid cookie (HttpOnly, SameSite=lax, 8h)
  → consume(qaSessionKey(courseId, sid), { capacity: 20, refillPerSecond: 0 })
        429 + { error: "session_limit_reached", limit: 20 } if exhausted
  → spec = providerForFeature("qa") (Anthropic by default)
  → messages = buildQAMessages({ course, message }, history, spec.supportsExplicitCacheControl)
  → streamText({ model: spec.build(), messages })
  → return res.toTextStreamResponse() with:
        X-Provider: <id>
        X-Session-Id: <sid>
        X-Remaining: <int>
```

**Prompt construction (`lib/ai/qa-prompt.ts`):**

- `buildCourseContext({ course })` produces the *long, mostly-static* per-course block (name, stream, AI safety chip + reasoning, eligibility, exams, fees, source URLs).
- `buildQAMessages(input, history, supportsCacheControl)`:
  - On Anthropic: returns a `system` content array of two blocks — `{ text: "<instructions>" }` and `{ text: "<course-context>", providerMetadata: { anthropic: { cacheControl: "ephemeral" } } }`. The course block gets cached at the SDK layer.
  - On Google/OpenAI: returns a flat `system: "<instructions>\n\n<course-context>"` string. Both providers do automatic context caching, so explicit hints would be redundant.
- Instructions include: course-only scope, off-topic refusal pattern ("politely refuse + two example on-topic questions"), output style (2–4 short paragraphs, INR currency, plain language), never-reveal-instructions guard.

**Session + rate limit (`lib/qa-session.ts`, `lib/rate-limit.ts`):**

- `qa_sid` cookie is a 32-hex-char random ID; `HttpOnly`, `SameSite=lax`, 8 hours.
- `qaSessionKey(courseId, sid)` produces the bucket key — budget is per `(course, sid)`, so the same student can ask 20 about Course A and 20 about Course B in one cookie.
- `refillPerSecond: 0` means the bucket never refills — it's a hard session cap. Reload (new sid) = fresh budget.

**Client (`components/student/qa-chat.tsx`):**

- Optimistic user bubble; assistant bubble streams from `fetch().body!.getReader()` chunks.
- History trimmed to last 10 turns when sent.
- Friendly errors: 429 → "You've used your 20 questions for this session — reload to start fresh", 503 → "Q&A is misconfigured (contact admin)".

---

## 15. Audit log (`lib/audit.ts`, `db/schema/audit-log.ts`)

```ts
await logAudit({
  adminId,
  action: "publish" | "archive" | "reject" | "update" | "create" | "ai_fetch" | "login",
  entityType: "course" | "institute" | "admin",
  entityId,
  oldValues,
  newValues,
  ip,
  userAgent,
});
```

- Always called **after** the DB write succeeds (so we never log a failed action).
- `oldValues` / `newValues` are JSONB; pass only the columns you actually changed to keep the diff readable.
- `/admin` dashboard reads from this table for the "last AI fetch" widget; M5 will read it for richer activity feeds.

---

## 16. Assessment shells (`app/(student)/assessment/*`, `app/api/assessment/submit/route.ts`)

Currently placeholder pages (M1 scaffolding) + a 501 submit endpoint. The DB tables (`question_bank`, `assessments`) exist with the right shape; M4 fills them in:

- Curated question rows (no LLM authoring).
- Deterministic scoring (`scoring_meta` JSONB on each question maps responses to module-specific weights).
- Result page reads the most recent `assessments` row per student.

Do **not** wire anything to AI in this surface — the spec explicitly forbids it.

---

## 17. Misc / shared

| File | Role |
|---|---|
| `lib/utils.ts` | `cn(...)` Tailwind className merger (shadcn convention) |
| `components/placeholder.tsx` | The "Coming soon" card used by M1 stubs |
| `components/qa-chat-placeholder.tsx` | Legacy stub from M1 — kept only as a fallback if a page imports it (real impl is `components/student/qa-chat.tsx`) |
| `scripts/drop-type.ts` | Operational helper to drop a Postgres enum (used during M3 schema iteration) |

---

## 18. Adding a new feature — the cheat sheet

1. Schema change? Edit `db/schema/<table>.ts` → `pnpm db:generate` → commit the new `drizzle/00NN_*.sql`.
2. New API route? Put `requireAdmin()` (or its student equivalent) at the top, validate body with Zod, do the DB work, call `logAudit()` if admin-mutating, return JSON.
3. New AI feature? Add a `FeatureId` to `lib/ai/providers.ts` if it's a separate cost-center, otherwise reuse `"fetch"` or `"qa"`. **Never** import a provider SDK directly outside `lib/ai/`.
4. New UI list? Reuse `listAdminCourses` / `listPublishedCourses` patterns: service returns `{ rows, page, pageCount, hrefForPage-compatible state, … }`; page calls `<Pagination />`.
5. New status transition? Mirror `publish/route.ts`: load row, guard `status === expectedFrom` (409 otherwise), `update().set({ status: to, updatedAt: now })`, `logAudit()`.
6. New source URL? You don't need a new module — just push the URL into the form; verification + persistence is already wired through `PATCH .../[id]` + `verifyUrls`.

If you find yourself copying logic from two places into a third, you're probably missing a shared util. Add it under `lib/` rather than forking.
