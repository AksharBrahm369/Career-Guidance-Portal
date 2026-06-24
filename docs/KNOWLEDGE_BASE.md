# Knowledge Base — Career Guidance Platform

> Current persistence note: runtime data now lives in `data/local-store.json`
> through the local adapter in `lib/db/index.ts`. Older Postgres/Drizzle
> migration references below are historical context and no longer required for
> local setup.

A single reference for **what this app is, why it's built this way, and the rules everything inside it has to follow.** Pair this with [`MODULES.md`](./MODULES.md) for per-module deep-dives.

> Last refreshed against branch `claude/career-guidance-platform-DVGCu` after the M4 profiling engine, the Better Auth migration (phone+password for admins *and* students), the admin ops surface (student CRUD, question-bank + cluster management), and the centralised course-transition guard (`lib/admin/course-transitions.ts`). 2026-06.

---

## 1. Product vision

A pan-India career guidance platform for students in **grades 9–12**. Two independent halves share a database and an admin team but otherwise live separate lives.

1. **Admin side** — operators (initially the founder + a few researchers) maintain an authoritative catalogue of undergraduate and post-12 courses + the institutes that offer them across India. AI helps **fetch** new candidate courses and answer student questions; humans always approve before anything ships student-side.
2. **Student side** — a mobile-first browse experience for the catalogue plus a resumable five-module assessment (interests, work style, aptitude, subject liking, marks) whose deterministic output is a ranked set of **career clusters** plus a curated short list of matching published courses.

AI is exposed in **exactly two places**:

| Surface | What it does | Trust posture |
|---|---|---|
| `/admin/fetch` | One AI call per query → a structured **batch** of course JSON the admin then edits & publishes. | Admin reviews before students see it. |
| `/courses/[slug]` Q&A | Streamed per-course chat for the student. | System prompt enforces course-only scope + deflects off-topic. |

The student profiling itself is **deterministic** — a curated `question_bank` + scoring algorithm, not an LLM. Spec calls this out so we don't drift.

---

## 2. Architectural shape

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Student UI     │   │     Admin UI     │   │   Auth / RBAC    │
│ /courses, Q&A,   │   │ /admin/* pages   │   │   Better Auth    │
│  /assessment     │   │                  │   │ (phone+password) │
└────────┬─────────┘   └──────┬───────────┘   └─────────┬────────┘
         │ RSC + SSE          │ RSC + form actions      │
         ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js 15 App Router (server-only modules guard secrets)       │
│  • lib/db             Drizzle + node-postgres                   │
│  • lib/ai             Pluggable provider registry (Anthropic /  │
│                       Google / OpenAI) + safe-fetch + qa-prompt │
│  • lib/auth.ts        Better Auth instance (phoneNumber + admin │
│                       plugins); guards in lib/auth/             │
│  • lib/assessment     Deterministic scoring (no LLM)            │
│  • lib/recommendation Cluster match + course ranking (no LLM)   │
│  • lib/url-verify     HEAD→GET fallback verifier                │
│  • lib/audit          Append-only admin action log              │
│  • lib/rate-limit     In-memory token bucket                    │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │  Postgres 16          │
                  │  (Drizzle migrations) │
                  └───────────────────────┘
```

### Why these choices

- **Next.js 15 App Router** — RSC + streaming covers the AI Q&A SSE plumbing and keeps secrets server-side by default. `output: "standalone"` keeps deployment portable (Docker, no Vercel lock-in).
- **Postgres + Drizzle** — boring, typed, migratable. Works against local docker-compose, Neon, Supabase, RDS — all via `DATABASE_URL`.
- **Better Auth** (`lib/auth.ts`) — phone+password for **everyone** (no email login, no OTP in v1; a synthetic `<phone>@phone.local` email satisfies core). Drizzle adapter, DB-backed sessions (24h expiry, 1h `freshAge`, 5-min cookie cache) and **DB-backed rate limiting** so brute-force counters survive serverless cold starts. `phoneNumber` + `admin` plugins (`defaultRole: "student"`); **no admin self-signup** (operator seeded via `scripts/create-admin.ts`).
- **Vercel AI SDK 6** with our own thin registry — gives us a single API surface for streaming, tool use, and structured output; we can swap provider without touching feature code.
- **Tailwind + shadcn baseline** — mobile-first by design.

---

## 3. Stack & runtime

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 + React 19 + TS strict | `noUncheckedIndexedAccess` on |
| Styling | Tailwind 3.4 + shadcn primitives | mobile-first; `1.19 kB` for `/courses` page bundle |
| DB | Postgres 16 + Drizzle ORM | `pg` driver, plain `DATABASE_URL` |
| Auth | Better Auth + `drizzleAdapter` | phone+password; `phoneNumber` + `admin` plugins; `lib/auth.ts` exports `auth`, guards wrap `auth.api.getSession` |
| Password | Better Auth built-in scrypt hashing | no native binding — Windows-friendly |
| AI | Vercel AI SDK 6 (`ai`, `@ai-sdk/{anthropic,google,openai}`) | abstracted via `lib/ai/providers.ts` |
| Runtime | Node 22 | Edge runtime only used for middleware |
| Package manager | pnpm | frozen lockfile in CI |
| Tests | Vitest 4 | unit-only, `pnpm test` |
| Container | Docker multi-stage (`output: "standalone"`) | non-root `nextjs:1001` |

---

## 4. Environments & configuration

All env vars are parsed by **`lib/env.ts`** (Zod schema) at module load. Missing/invalid → throws at startup. Never read `process.env` directly elsewhere.

| Key | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes, ≥32 chars | — | Better Auth signing/encryption secret |
| `BETTER_AUTH_URL` | no | `http://localhost:3000` | Auth base URL (cookies, trusted origin) |
| `AI_PROVIDER` | no | `anthropic` | Global AI provider (`anthropic` / `google` / `openai`) |
| `AI_FETCH_PROVIDER` | no | `AI_PROVIDER` | Override just for admin fetch |
| `AI_QA_PROVIDER` | no | `AI_PROVIDER` | Override just for course Q&A |
| `ANTHROPIC_API_KEY` | conditional | — | required if Anthropic is selected anywhere |
| `GOOGLE_GENERATIVE_AI_API_KEY` | conditional | — | required if Google is selected anywhere |
| `OPENAI_API_KEY` | conditional | — | required if OpenAI is selected anywhere |
| `NODE_ENV` | no | `development` | standard |

`.env.example` ships in the repo; copy to `.env.local` for dev.

One deliberate exception to the "everything through `lib/env.ts`" rule: the optional `BETTER_AUTH_TRUSTED_ORIGINS` (comma-separated extra CSRF-trusted origins, e.g. Vercel previews) is read directly in `lib/auth.ts`.

---

## 5. Data model (high level)

Full column-level shapes are in [`MODULES.md` §DB Schema](./MODULES.md#3-database--migrations). The 30-second view:

- **Better Auth tables** (`db/schema/auth.ts`) — `user / session / account / verification / rate_limit`. One `user` table for **both roles**: `role` (`admin | student`, set by the `admin` plugin), `phoneNumber` (unique, the real login identifier), plus student profile fields (`grade`, `cooldownOverride`, `lastAssessmentAt`). `rate_limit` backs the DB-stored auth rate limiter.
- **`institutes`** — name, type (`government | private | deemed | autonomous | international`), ranking tag, city/state, website. Slug unique with random fallback for all-Devanagari names.
- **`courses`** — name, stream, career clusters (text[]), AI safety tag (`ai_safe | ai_augmented | ai_risk`) + reasoning, eligibility, entrance exams, tenure, fees range, source URLs, **status** (`draft | pending_review | published | archived | rejected`), source (`ai_fetch | manual`), rejection reason, audit timestamps + admin FKs (→ `user.id`).
- **`course_institutes`** — many-to-many with cascade-delete FKs + composite unique index (no orphans, no duplicates).
- **`career_clusters`** — the recommendation engine's targets: unique `key`, target profile (RIASEC / aptitude / work-style emphases) + per-lens weights as JSONB, `active` flag. Admin-managed at `/admin/clusters`.
- **`question_bank`** — curated, versioned questions per module (`aptitude | interests | work_style`) with `scoring_map` / `correct_option_id` (answer keys never reach the client), `is_active` flag. Admin-managed at `/admin/question-bank`; seeded via `scripts/seed-question-bank.ts`.
- **`assessments`** — one row per attempt: raw per-module `responses` JSONB plus the scored profile (interest data, work-style + aptitude scores, subject affinities, marks, confidence) and the recommendation output (`cluster_scores`, `recommended_courses`, ranked clusters).
- **`audit_log`** — every admin action with old/new values JSONB + IP + UA. Action enum: `create | update | publish | archive | reject | login | ai_fetch | delete | ban | unban | reset_password | reset_cooldown | reopen | restore`.

### Course status lifecycle

```
   draft ─┐
          │  AI fetch / manual create
          ▼
    pending_review ──reject──▶ rejected ──reopen──▶ pending_review
          │                       │
          │                       (rejection_reason cleared,
          │                        reviewed_by_admin_id cleared)
          │
       publish
          │
          ▼
      published ──archive──▶ archived ──restore──▶ published
                                                 (published_at preserved)
```

The matrix is **enforced strictly** by `lib/admin/course-transitions.ts` — a pure module exporting `TRANSITIONS` (exactly five legal moves: `publish: pending_review→published`, `reject: pending_review→rejected`, `archive: published→archived`, `reopen: rejected→pending_review`, `restore: archived→published`) and `checkTransition(action, actual)`. All five lifecycle routes call it before writing; a mismatch returns **HTTP 409** with body `{ error: "invalid_transition", action, expected, actual }` (formatted for the admin UI by `formatInvalidTransition`). Every successful transition then logs to `audit_log` under its own action (`publish | reject | archive | reopen | restore`) — after the write, never before.

---

## 6. AI surface — rules & invariants

- **Never imported from client components.** `lib/ai/*` are all `import "server-only"`. Only API routes and server components touch them.
- **Pluggable provider** via `lib/ai/providers.ts`. Code picks model with `getModel("fetch")` or `getModel("qa")` — the *feature* binds, not the provider.
- **Admin fetch** uses **structured output** via Zod (`experimental_output: Output.object({ schema: CoursesBatchOutput })` — an array of `CourseFetchResult`, so one query can yield several courses) so we never have to parse JSON by hand. Provider-side validation catches schema drift; per-course failures are collected, not fatal.
- **Source URLs** returned by the AI are **always verified** through `lib/url-verify.ts` before persistence: dead (4xx/5xx) dropped with a warning, transient `unknown` kept.
- **Q&A streaming** uses `streamText`. System prompt is split into a course-context block that carries `providerMetadata.anthropic.cacheControl = "ephemeral"` only when `supportsExplicitCacheControl`. Google/OpenAI receive a flat string (they handle caching automatically).
- **Off-topic deflection** is encoded in the system prompt, not in code: assistant refuses + offers two example on-topic questions.
- **Per-session rate limit**: 20 messages per (course × `qa_sid` cookie). Token bucket has `refillPerSecond: 0` → hard session cap, reload = new session = fresh budget.
- **Per-admin rate limit**: in-memory token bucket with `capacity: 20`, refilling at 20 tokens/minute (`app/api/admin/fetch/route.ts`). Documented as a single-replica simplification; Redis swap deferred. (Distinct from the *auth* rate limiter, which is DB-backed inside Better Auth.)

---

## 7. Auth, RBAC & secrets

| Concern | Implementation |
|---|---|
| Identity | Phone+password for everyone (no email login, no OTP in v1). `normalizePhone()` in `lib/phone.ts` is the single source of truth for the identifier; a synthetic `<phone>@phone.local` email satisfies Better Auth core. |
| Login | `/admin/login` and `/student/login` → Better Auth phone-number sign-in (`signIn.phoneNumber`). Students self-sign-up at `/student/signup`; **no admin signup route**. |
| Roles | `admin` plugin: `user.role` is `admin` or `student` (`defaultRole: "student"`). |
| Admin seeding | `pnpm create-admin` — prompts for name/phone/password, signs up via `auth.api`, then sets `phoneNumber` + `role: "admin"` (leaves `phoneNumberVerified: false` — honest, since v1 has no OTP). |
| Session | DB-backed `session` table: 24h expiry, refreshed hourly, 1h `freshAge`; 5-min `cookieCache` cuts per-request DB hits. `getCachedSession()` (`lib/auth/session.ts`) memoizes `auth.api.getSession` per request via `React.cache`. |
| Brute force | Better Auth rate limiting with `storage: "database"` (`rate_limit` table): 5/min on `/sign-in/phone-number`, 3/min on `/sign-up/email`. Enabled in every environment. |
| Middleware | `middleware.ts` is an *optimistic* session-**cookie-existence** gate (no DB) — redirects cookie-less `/admin/*` → `/admin/login` and `/assessment` + `/student/*` → `/student/login`, and sets `x-pathname` for layouts. `/courses` is deliberately public. |
| Role gate | The authoritative role check lives in the guards and the `(admin)` layout, which exempts `/admin/login` (via `x-pathname`) and `redirect()`s non-admins to it. |
| Server guard | API routes call `requireAdmin()` / `requireStudent()` (`lib/auth/require-{admin,student}.ts`) which throw → `adminErrorResponse` / `studentErrorResponse` return 401. They return `{ adminId }` / `{ studentId }` = `user.id`. |
| Q&A "session" | Anonymous — `HttpOnly`, `SameSite=lax`, 8h `qa_sid` cookie (`lib/qa-session.ts`); NOT Better Auth |

Never check the session client-side. Never trust client-supplied admin/role hints. Only the guards are authoritative. With no OTP, `user.phoneNumber` is **unproven** — never treat `phoneNumberVerified` as ownership proof until real OTP ships.

---

## 8. Observability — `audit_log`

`lib/audit.ts` exposes `logAudit({ adminId, action, entityType, entityId, oldValues, newValues, ip, userAgent })`. Append-only.

Action enum: `create | update | publish | archive | reject | login | ai_fetch | delete | ban | unban | reset_password | reset_cooldown | reopen | restore` — the course lifecycle now logs `reopen`/`restore` under their own actions, and the admin student-management surface logs `ban / unban / delete / reset_password / reset_cooldown`.

Every mutating admin endpoint calls `logAudit` after the DB write succeeds — never before. Old + new JSONB lets the dashboard reconstruct a diff for any row.

`/admin` dashboard reads the latest `ai_fetch` row for the "last AI fetch" widget.

---

## 9. Coding conventions (read-once-and-internalize)

- **Server-only files declare it.** First line: `import "server-only";`. Anything in `lib/ai/`, `lib/auth/`, `lib/db/`, `lib/admin/*` (except the pure `course-transitions.ts`), `lib/student/courses.ts`, `lib/url-verify.ts`. Deliberate exceptions: `lib/auth.ts` (the Better Auth CLI loads it in plain Node to generate the schema) and `lib/phone.ts` (the client auth forms import it). The vitest config aliases `server-only` to a stub so server modules unit-test cleanly.
- **No client-side env reads.** Every secret goes through `lib/env.ts`.
- **No comments explaining WHAT.** Only WHY when non-obvious (hidden invariant, workaround for a bug, surprising behaviour).
- **Reuse, don't re-invent.** The shared `<Pagination />`, `requireAdmin`, `consume()` rate limiter, `verifyUrls`, `safeFetchCourse`, and `logAudit` already exist — extend them, don't fork them.
- **Status transitions are explicit.** Anywhere `courses.status` mutates, call `checkTransition()` from `lib/admin/course-transitions.ts` and return HTTP 409 with its body if the source state doesn't match. Don't hand-roll the guard — extend `TRANSITIONS` instead.
- **Drop comments for removed code.** No `// removed in Mn` placeholders, no re-export shims for old paths. Delete dead code.
- **Never amend pushed commits.** Always a new commit.

---

## 10. Operations & deployment

- **Local dev**:
  1. `cp .env.example .env.local` and fill at least `BETTER_AUTH_SECRET` (≥32 chars — `openssl rand -base64 32`) and `ANTHROPIC_API_KEY` (or your chosen provider key).
  2. `docker compose up -d db`
  3. `pnpm install`
  4. `pnpm db:migrate`
  5. `pnpm create-admin` (one-time; prompts for name/phone/password)
  6. `pnpm dev`
- **CI** (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` → typecheck → lint → `drizzle-kit check` → `pnpm test` → `pnpm build`. No deploy step.
- **Docker**: `docker compose up --build` boots Postgres + app; the entrypoint applies migrations before launching `server.js`.
- **Migrations**: never rewrite a shipped migration. `pnpm db:generate` after a schema edit → commit the new `drizzle/00NN_*.sql` alongside the schema diff. Production runner is `scripts/migrate.ts` (`pnpm db:migrate`).
- **Rollback** for bad data, not bad schema: revert the schema commit, generate a *new* migration that undoes it, ship that. Never re-edit `0000_*.sql` etc.

---

## 11. Milestone roadmap

| Milestone | Status | Scope summary |
|---|---|---|
| M1 — Foundation | shipped | Scaffold, schema, auth shell, AI client stub, Docker, CI |
| M2 — Admin core | shipped | AI fetch + tool-use schema, review queue, publish/reject, manual create, audit log, scrypt password hash, rate-limit, AI provider abstraction |
| M3 — Student core | shipped | Catalogue with filters + pagination, course detail, related courses, AI Q&A streaming + session cap |
| **M3 hotfix** | **shipped** | Archived/rejected admin visibility, status tabs, server-side admin pagination, source-URL verification, restore/reopen/verify-sources endpoints, SourceUrlsEditor |
| Auth migration | shipped | NextAuth → **Better Auth**: phone+password for both roles, student signup/login, DB sessions + DB-backed auth rate limiting, `getCachedSession`, cookie-gate middleware |
| Admin ops | shipped | Admin shell redesign, student CRUD (ban/unban, delete, reset password, reset cooldown), question-bank management, career-cluster management, extended audit actions, centralised transition guard |
| M4 — Profiling | **feature-complete** | Student auth, five-module assessment (interests/work-style/aptitude/subjects/marks), deterministic scoring (`lib/assessment/scoring`) + recommendation engine (`lib/recommendation`), captured-profile result screen. Retake-cooldown *fields* exist (`lastAssessmentAt`, `cooldownOverride`, admin reset) but the automatic gate is not enforced yet. |
| M5 — Polish | pending | Institute filtering surfaced student-side, sortable/searchable admin tables, bulk lifecycle actions, citations in Q&A, cluster filter chips, retake-cooldown enforcement |

---

## 12. Glossary

- **AI safety tag** — `ai_safe | ai_augmented | ai_risk`. Indicates how AI exposure is expected to evolve careers downstream of this course. Both the model and the admin can set it; we store the model's pick in `ai_safety_tag_ai` for audit and the human-confirmed value in `ai_safety_tag`.
- **Career cluster** — short text tag (e.g., `"healthcare-research"`) repeated across courses; used by `arrayOverlaps()` to match related courses and (M5) by the student catalogue's filter chips.
- **Stream** — `science | commerce | arts | vocational`. One per course (a course is taxonomically primary in one stream).
- **`qa_sid`** — anonymous HttpOnly cookie that scopes the Q&A message budget (`capacity: 20, refillPerSecond: 0`). Reloading sets a new sid.
- **Source URLs** — URLs the AI cited (or an admin pasted) supporting the course's claims. Bounded to ≤8 per course, verified at write time.
- **Verified / broken / unknown / unchecked** — UI states from `lib/url-verify.ts`: HTTP 2xx-3xx, HTTP 4xx-5xx, network/timeout, never-checked respectively.
