# Modules — Learning  Platform

> Current persistence note: the app now stores runtime data locally in
> `data/local-store.json` through `lib/db/index.ts`. Older Drizzle/Postgres
> migration details below are historical context and no longer part of setup.

Per-module reference: what lives where, the contracts at the seams, and the gotchas you only learn after debugging once. Read [`KNOWLEDGE_BASE.md`](./KNOWLEDGE_BASE.md) first for the why.

Order is roughly bottom-up: **Foundation → AI → Admin → Student**.

---

## 1. Environment & config (`lib/env.ts`)

**Owns:** validating + exposing runtime env to every server module.

- Single Zod schema parses `process.env` at module load. Failure throws synchronously — server won't start with bad config.
- Refine() check: the API key for whichever provider `AI_PROVIDER` selects **must** be present.
- Importers: `lib/db`, `lib/auth.ts`, `lib/ai/*`, `drizzle.config.ts`.
- Type re-exports: `Env`, `ProviderId`.

> **Rule:** never reach into `process.env` from anywhere else. If you need a new var, add it to `EnvSchema` and re-export through `env`.

---

## 2. Database access (`lib/db/index.ts` + `db/schema/*`)

**Owns:** the Drizzle client + the typed schema.

- `lib/db/index.ts` builds a singleton `Pool` (node-postgres) keyed by `DATABASE_URL` and wraps it in `drizzle()` with `schema` for query DSL + typed select.
- Schema is split per table under `db/schema/`:
  - `enums.ts` — every Postgres enum (status, source, stream, AI safety, assessment module/status, audit action, etc.)
  - `institutes.ts`, `courses.ts` (+ `course_institutes`), `career-clusters.ts`, `assessments.ts`, `question-bank.ts`, `audit-log.ts`
  - `auth.ts` — Better Auth tables (`user / session / account / verification / rate_limit`); the single `user` table holds admins **and** students (`role` column + student fields `grade`, `cooldownOverride`, `lastAssessmentAt`)
  - `relations.ts` — Drizzle `relations()` for join queries
  - `index.ts` re-exports everything so `import { courses, institutes, courseInstitutes, auditLog } from "@/db/schema"` is the one-import surface.

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
reviewedByAdminId / createdByAdminId / lastEditedByAdminId: uuid -> user.id
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

Current migrations on the branch: `0000_late_albert_cleary.sql` (full initial schema — courses/institutes, career clusters, assessments, question bank, audit log, Better Auth tables), `0001_hot_stephen_strange.sql` (`rate_limit` table for DB-backed auth rate limiting), `0002_stormy_jimmy_woo.sql` (extends the `audit_action` enum with `delete / ban / unban / reset_password / reset_cooldown / reopen / restore`).

---

## 4. Auth & RBAC (`lib/auth.ts`, `lib/auth-client.ts`, `lib/auth/*`, `middleware.ts`, `scripts/create-admin.ts`)

**Better Auth**, phone+password for both roles (no email login, no OTP in v1 — `sendOTP` is a no-op and a synthetic `<phone>@phone.local` email satisfies core).

| File | Role |
|---|---|
| `lib/auth.ts` | The Better Auth instance: `drizzleAdapter(db, { provider: "pg" })`, `phoneNumber` + `admin` plugins (`defaultRole: "student"`, `adminRoles: ["admin"]`), `nextCookies()` **last**; DB-backed rate limiting (`storage: "database"`, 5/min sign-in, 3/min sign-up); sessions 24h with 1h `updateAge`/`freshAge` + 5-min `cookieCache`; UUID ids; student `additionalFields` (`grade`, `cooldownOverride`, `lastAssessmentAt`). Deliberately **no** `import "server-only"` — the Better Auth CLI loads it in plain Node. |
| `lib/auth-client.ts` | `createAuthClient` (better-auth/react) + `phoneNumberClient` + `adminClient`; exports `signIn / signUp / signOut / useSession` for client components |
| `lib/auth/session.ts` | `getCachedSession()` — `React.cache`-memoized `auth.api.getSession({ headers })`, so the layout + guards share one session lookup per request |
| `lib/auth/require-admin.ts` | Server guard: `requireAdmin()` → `{ adminId, email }` (`adminId` = `user.id`); throws `UnauthorizedError` → `adminErrorResponse(err)` returns 401 |
| `lib/auth/require-student.ts` | Mirror guard: `requireStudent()` → `{ studentId, name }`; `studentErrorResponse` returns 401 |
| `lib/phone.ts` | `normalizePhone()` + `synthEmailFromPhone()` — the **single source of truth** for the phone identifier; no `server-only` (client forms import it) |
| `middleware.ts` | Optimistic **cookie-existence** gate (no DB call): sets `x-pathname`, exempts `/admin/login` + `/student/login` + `/student/signup`, redirects cookie-less `/admin/*` → `/admin/login` and `/assessment` + `/student/*` → `/student/login`. `/courses` stays public (not matched). |
| `app/(admin)/layout.tsx` | The authoritative admin **role** gate — `redirect("/admin/login")` for non-admins, exempting its own login route via `x-pathname` |
| `app/api/auth/[...all]` | Better Auth route handler |
| `scripts/create-admin.ts` | `pnpm create-admin` — prompts name/phone/password, signs up via `auth.api`, then sets `phoneNumber` (normalized) + `role: "admin"`, keeping `phoneNumberVerified: false` |

**Session shape:**
```ts
session.user = { id: <uuid>, name, email, role: "admin" | "student", phoneNumber, ... }
// guards return { adminId } / { studentId } — both are user.id
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

`requireAdmin()` / `requireStudent()` are the only things API routes should trust for role checks. Don't read `session?.user?.role` directly anywhere else (the `(admin)` layout and assessment page go through `getCachedSession` / the guards).

> ⚠️ Any change here must pass the **verification gate** in `CLAUDE.md`: a real browser login or HTTP `sign-in → get-session` round-trip against `pnpm dev` — cookie/redirect bugs compile clean and pass server-side smokes.

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
POST /api/admin/fetch   body: { query, override? }
  → requireAdmin()
  → consume(`fetch:${adminId}`)  // capacity 20, refills 20/min, in-memory bucket
  → safeFetchCourseBatch({ query, excludeNames })   // excludeNames skipped when override=true
        → generateText() with experimental_output (Zod CoursesBatchOutput — an ARRAY of courses)
        → per-course validation; soft duplicate warning if name > 85% similar to existing
        → verifyUrls(sourceUrls)  // dead dropped, unknown kept
  → for each returned course: persistFetchedCourse(course, ctx)  // inside a TX:
        upsert institutes (onConflictDoNothing on slug)
        insert course (status='pending_review', source='ai_fetch')
        link course_institutes (composite unique avoids dup)
        logAudit("ai_fetch")
     (a persist failure is collected into `failures`, not fatal to the batch)
  → return { mode: "batch", total, failures, courses: [{ courseId, slug, provider, warnings, course }] }
```

**Files:**

- `lib/ai/safe-fetch.ts`
  - `CourseFetchResult` — Zod schema for one structured course (name, stream, clusters, AI safety, eligibility, exams, fees, sources, description, institutes); `CoursesBatchOutput` wraps it in `{ courses: [...] }` so one query can return several.
  - `SYSTEM_PROMPT` — pinned in this file; deliberately includes the "no duplicates" + "evidence-first" rules.
  - `safeFetchCourseBatch({ query, excludeNames })` returns `{ results: [{ course, provider, warnings }], failures }`; throws `FetchFailedError` when the provider returns nothing usable.
- `lib/admin/persist-fetched-course.ts` — transaction-safe persistence. Uses `onConflictDoNothing({ target: institutes.slug })` + a fallback select to handle two parallel fetches sharing the same institute.
- `lib/slug.ts` — `slugify()` returns 6-char random suffix when input has no ASCII (Devanagari, etc.) so we never emit empty slugs and never collide on `""`.
- `lib/rate-limit.ts` — `consume(key, cfg)` token bucket; admin fetch passes `capacity: 20, refillPerSecond: 20/60`. Returns `{ ok: false, retryAfterSeconds }` on miss → HTTP 429.

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
| `POST .../reopen` | `status === "rejected"` | `rejected → pending_review`, clears `rejectionReason` + `reviewedByAdminId` | `reopen` |

All return HTTP 409 with `{ error: "invalid_transition", action, expected, actual }` if the source state doesn't match. The transition matrix is centralised in `lib/admin/course-transitions.ts` (`TRANSITIONS` + `checkTransition()`, tested in `lib/__tests__/course-transitions.test.ts`); all five lifecycle routes (publish/reject/reopen/archive/restore) use it.

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

- `POST /api/admin/courses/[id]/archive` — `published → archived` (already shipped in M2). Audit `archive`.
- `POST /api/admin/courses/[id]/restore` — `archived → published`. Mirrors the publish/archive pattern; preserves the original `publishedAt` (sets it to `now()` only if null). Audit `restore`.
- `POST /api/admin/courses/[id]/reopen` — `rejected → pending_review`. Clears `rejectionReason` + `reviewedByAdminId`. Audit `reopen`.

Both guard via `checkTransition()` and 409 on invalid transitions.

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
  → linked institutes loaded (promise started early, awaited late)
  → { model, supportsCacheControl, providerLabel } = getModel("qa")  (Anthropic by default)
  → { system, messages } = buildQAMessages({ course, institutes }, history, supportsCacheControl)
  → streamText({ model, system, messages, temperature: 0.4 })
  → return result.toTextStreamResponse() with:
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
  action, // see the full enum below
  entityType, // e.g. "course" | "student" | "question_bank_item" | "career_cluster"
  entityId,
  oldValues,
  newValues,
  ip,
  userAgent,
});
```

**`AuditAction` enum** (mirrors the `audit_action` Postgres enum, extended by migration `0002`):

| Action | Logged by |
|---|---|
| `create` / `update` | manual course create, course PATCH, question-bank + cluster create/update |
| `publish` / `reject` / `archive` / `reopen` / `restore` | the five course lifecycle routes — each transition logs under **its own** action |
| `ai_fetch` | `persistFetchedCourse` (one row per persisted course) |
| `delete` | student delete, question-bank delete |
| `ban` / `unban` | `POST /api/admin/students/[id]/ban` (one route, body picks the direction) |
| `reset_password` / `reset_cooldown` | the matching `/api/admin/students/[id]/*` routes |
| `login` | in the enum for auth events; not currently emitted by any route |

- Always called **after** the DB write succeeds (so we never log a failed action).
- `oldValues` / `newValues` are JSONB; pass only the columns you actually changed to keep the diff readable.
- `/admin` dashboard reads from this table for the "last AI fetch" widget; M5 will read it for richer activity feeds.

---

## 16. Assessment & recommendation (`app/(student)/assessment/page.tsx`, `app/api/assessment/*`, `lib/assessment/*`, `lib/recommendation/*`)

**Live and fully deterministic** — no LLM anywhere in this path (platform invariant; the spec explicitly forbids it).

**Flow:**

```
POST /api/assessment/start                  → resume the student's in_progress attempt or insert a fresh one
PATCH /api/assessment/[id]/responses        → save one module's answers into the attempt's `responses` jsonb
   modules: interests | work_style | aptitude (question-bank driven)
            subjects (subject → 1..5 liking)  |  marks (board, stream, subject marks)
POST /api/assessment/[id]/submit            → finalize:
   404 unknown attempt · 403 not the owner · 409 already_completed · 400 incomplete (missing modules listed)
   → scoreAssessment(responses, items)      // lib/assessment/scoring — pure
   → recommend(profile, clusters, courses)  // lib/recommendation — pure
   → one TX: assessments row gets status='completed' + scored profile + cluster/course output;
             user.lastAssessmentAt = now()
```

All three routes guard with `requireStudent()`.

**Pieces:**

- `app/(student)/assessment/page.tsx` — server component: renders the captured profile if the latest attempt is completed, else the resumable 5-module wizard (`components/student/assessment/*`). **Answer keys (`correctOptionId`, `scoringMap`) are stripped server-side** — only `ClientItem` reaches the client.
- `lib/assessment/items.ts` — `getActiveItems(module)` loads active `question_bank` rows; `lib/assessment/scoring/*` scores each lens (RIASEC interests, work-style traits, banded aptitude, subject affinities, marks profile) plus an overall `confidence` (`high | moderate | low`).
- `lib/recommendation/*` — gate → cluster match (against `career_clusters.targetProfile` with per-cluster `lensWeights`) → eligibility-filtered course ranking over the published catalogue (`getRecommendationInputs()`); caps at 10 courses and flags `lowSignal` shortlists so the UI avoids a falsely-confident #1.
- Content is seeded, never LLM-authored: `scripts/seed-question-bank.ts` + `scripts/seed-clusters.ts`.

Retake cooldown: the *fields* exist (`user.lastAssessmentAt`, `user.cooldownOverride`, admin reset endpoint) but `start` does not enforce a cooldown gate yet.

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
5. New status transition? Add it to `TRANSITIONS` in `lib/admin/course-transitions.ts` (+ a case in `lib/__tests__/course-transitions.test.ts`), then mirror `publish/route.ts`: load row, `checkTransition()` (return its body with 409 on mismatch), `update().set({ status: to, updatedAt: now })`, `logAudit()` after the write.
6. New source URL? You don't need a new module — just push the URL into the form; verification + persistence is already wired through `PATCH .../[id]` + `verifyUrls`.

If you find yourself copying logic from two places into a third, you're probably missing a shared util. Add it under `lib/` rather than forking.
