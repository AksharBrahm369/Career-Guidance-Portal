# Knowledge Base — Career Guidance Platform

A single reference for **what this app is, why it's built this way, and the rules everything inside it has to follow.** Pair this with [`MODULES.md`](./MODULES.md) for per-module deep-dives.

> Last refreshed against branch `claude/career-guidance-platform-DVGCu` at the M3 hotfix (archived/rejected admin visibility, admin pagination, source-URL verification).

---

## 1. Product vision

A pan-India career guidance platform for students in **grades 9–12**. Two independent halves share a database and an admin team but otherwise live separate lives.

1. **Admin side** — operators (initially the founder + a few researchers) maintain an authoritative catalogue of undergraduate and post-12 courses + the institutes that offer them across India. AI helps **fetch** new candidate courses and answer student questions; humans always approve before anything ships student-side.
2. **Student side** — a mobile-first browse experience for the catalogue and (M4 onward) three short profiling modules whose deterministic output is a recommended **career cluster** plus a curated short list of matching courses.

AI is exposed in **exactly two places**:

| Surface | What it does | Trust posture |
|---|---|---|
| `/admin/fetch` | One AI call per query → structured course JSON the admin then edits & publishes. | Admin reviews before students see it. |
| `/courses/[slug]` Q&A | Streamed per-course chat for the student. | System prompt enforces course-only scope + deflects off-topic. |

The student profiling itself is **deterministic** — a curated `question_bank` + scoring algorithm, not an LLM. Spec calls this out so we don't drift.

---

## 2. Architectural shape

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Student UI     │   │     Admin UI     │   │   Auth / RBAC    │
│  /courses, Q&A   │   │ /admin/* pages   │   │ NextAuth v5 JWT  │
└────────┬─────────┘   └──────┬───────────┘   └─────────┬────────┘
         │ RSC + SSE          │ RSC + form actions      │
         ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js 15 App Router (server-only modules guard secrets)       │
│  • lib/db          Drizzle + node-postgres                      │
│  • lib/ai          Pluggable provider registry (Anthropic /     │
│                    Google / OpenAI) + safe-fetch + qa-prompt    │
│  • lib/auth        Credentials provider, scrypt password hash   │
│  • lib/url-verify  HEAD→GET fallback verifier                   │
│  • lib/audit       Append-only admin action log                 │
│  • lib/rate-limit  In-memory token bucket                       │
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
- **Auth.js (NextAuth v5)** — JWT session strategy (`maxAge: 8h`) so we don't need a session table for admins. Credentials provider only; **no admin self-signup** (operator seeded via `scripts/create-admin.ts`).
- **Vercel AI SDK 6** with our own thin registry — gives us a single API surface for streaming, tool use, and structured output; we can swap provider without touching feature code.
- **Tailwind + shadcn baseline** — mobile-first by design.

---

## 3. Stack & runtime

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 + React 19 + TS strict | `noUncheckedIndexedAccess` on |
| Styling | Tailwind 3.4 + shadcn primitives | mobile-first; `1.19 kB` for `/courses` page bundle |
| DB | Postgres 16 + Drizzle ORM | `pg` driver, plain `DATABASE_URL` |
| Auth | NextAuth v5 + `@auth/drizzle-adapter` | credentials only; `auth.ts` exports `auth()` for RSC + middleware |
| Password | Node built-in `crypto.scrypt` | Windows-friendly; replaces `@node-rs/argon2` |
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
| `AUTH_SECRET` | yes, ≥32 chars | — | NextAuth JWT signing key |
| `NEXTAUTH_URL` | no | `http://localhost:3000` | Callback URL base |
| `AI_PROVIDER` | no | `anthropic` | Global AI provider (`anthropic` / `google` / `openai`) |
| `AI_FETCH_PROVIDER` | no | `AI_PROVIDER` | Override just for admin fetch |
| `AI_QA_PROVIDER` | no | `AI_PROVIDER` | Override just for course Q&A |
| `ANTHROPIC_API_KEY` | conditional | — | required if Anthropic is selected anywhere |
| `GOOGLE_GENERATIVE_AI_API_KEY` | conditional | — | required if Google is selected anywhere |
| `OPENAI_API_KEY` | conditional | — | required if OpenAI is selected anywhere |
| `NODE_ENV` | no | `development` | standard |

`.env.example` ships in the repo; copy to `.env.local` for dev.

---

## 5. Data model (high level)

Full column-level shapes are in [`MODULES.md` §DB Schema](./MODULES.md#3-database--migrations). The 30-second view:

- **`admins`** — operators with login; **no student rows in here** (M4 introduces `students`).
- **`institutes`** — name, type (`government | private | deemed | autonomous | international`), ranking tag, city/state, website. Slug unique with random fallback for all-Devanagari names.
- **`courses`** — name, stream, career clusters (text[]), AI safety tag (`ai_safe | ai_augmented | ai_risk`) + reasoning, eligibility, entrance exams, tenure, fees range, source URLs, **status** (`draft | pending_review | published | archived | rejected`), source (`ai_fetch | manual`), rejection reason, audit timestamps + admin FKs.
- **`course_institutes`** — many-to-many with cascade-delete FKs + composite unique index (no orphans, no duplicates).
- **`question_bank` / `assessments`** — schema lives, content empty until M4.
- **`audit_log`** — every admin action (publish, archive, reject, restore, reopen, login, AI fetch) with old/new values JSONB + IP + UA.
- **NextAuth tables** — standard `users / accounts / sessions / verification_tokens`.

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

Every transition logs to `audit_log`. Invalid transitions return HTTP 409.

---

## 6. AI surface — rules & invariants

- **Never imported from client components.** `lib/ai/*` are all `import "server-only"`. Only API routes and server components touch them.
- **Pluggable provider** via `lib/ai/providers.ts`. Code picks model with `getModel("fetch")` or `getModel("qa")` — the *feature* binds, not the provider.
- **Admin fetch** uses **structured output** via Zod (`experimental_output: Output.object({ schema: CourseFetchResult })`) so we never have to parse JSON by hand. Provider-side validation catches schema drift.
- **Source URLs** returned by the AI are **always verified** through `lib/url-verify.ts` before persistence: dead (4xx/5xx) dropped with a warning, transient `unknown` kept.
- **Q&A streaming** uses `streamText`. System prompt is split into a course-context block that carries `providerMetadata.anthropic.cacheControl = "ephemeral"` only when `supportsExplicitCacheControl`. Google/OpenAI receive a flat string (they handle caching automatically).
- **Off-topic deflection** is encoded in the system prompt, not in code: assistant refuses + offers two example on-topic questions.
- **Per-session rate limit**: 20 messages per (course × `qa_sid` cookie). Token bucket has `refillPerSecond: 0` → hard session cap, reload = new session = fresh budget.
- **Per-admin rate limit**: 10 AI fetches per minute, in-memory token bucket. Documented as a single-replica simplification; Redis swap deferred.

---

## 7. Auth, RBAC & secrets

| Concern | Implementation |
|---|---|
| Admin login | `app/admin/login` → credentials provider (`lib/auth/config.ts`) → scrypt verify (`lib/auth/password.ts`) |
| Password format | `scrypt$N=2^15,r=8,p=1$<saltB64>$<hashB64>` |
| Admin seeding | `pnpm tsx scripts/create-admin.ts` — prompts for email/password, hashes, inserts. No public signup route. |
| Session | JWT (`strategy: "jwt"`, `maxAge: 8h`); JWT callback injects `role: "admin"` and `adminId` |
| Edge guard | `middleware.ts` uses the edge-safe auth split (`lib/auth/edge.ts`) to redirect unauth'd `/admin/*` to `/admin/login` |
| Server guard | API routes call `requireAdmin()` (`lib/auth/require-admin.ts`) which throws `UnauthorizedError` → `adminErrorResponse(err)` returns 401 |
| Q&A "session" | Anonymous — `HttpOnly`, `SameSite=lax`, 8h `qa_sid` cookie (`lib/qa-session.ts`); NOT NextAuth |

Never check the session client-side. Never trust client-supplied admin/role hints. Only `requireAdmin` is authoritative.

---

## 8. Observability — `audit_log`

`lib/audit.ts` exposes `logAudit({ adminId, action, entityType, entityId, oldValues, newValues, ip, userAgent })`. Append-only.

Action enum: `create | update | publish | archive | reject | login | ai_fetch`.

Every mutating admin endpoint calls `logAudit` after the DB write succeeds — never before. Old + new JSONB lets the dashboard reconstruct a diff for any row.

`/admin` dashboard reads the latest `ai_fetch` row for the "last AI fetch" widget.

---

## 9. Coding conventions (read-once-and-internalize)

- **Server-only files declare it.** First line: `import "server-only";`. Anything in `lib/ai/`, `lib/auth/`, `lib/db/`, `lib/admin/*`, `lib/student/courses.ts`, `lib/url-verify.ts`. The vitest config aliases `server-only` to a stub so server modules unit-test cleanly.
- **No client-side env reads.** Every secret goes through `lib/env.ts`.
- **No comments explaining WHAT.** Only WHY when non-obvious (hidden invariant, workaround for a bug, surprising behaviour).
- **Reuse, don't re-invent.** The shared `<Pagination />`, `requireAdmin`, `consume()` rate limiter, `verifyUrls`, `safeFetchCourse`, and `logAudit` already exist — extend them, don't fork them.
- **Status transitions are explicit.** Anywhere `courses.status` mutates, return HTTP 409 if `from` doesn't match the expected source state. See restore/reopen/publish/archive routes for the pattern.
- **Drop comments for removed code.** No `// removed in Mn` placeholders, no re-export shims for old paths. Delete dead code.
- **Never amend pushed commits.** Always a new commit.

---

## 10. Operations & deployment

- **Local dev**:
  1. `cp .env.example .env.local` and fill at least `AUTH_SECRET`, `ANTHROPIC_API_KEY` (or your chosen provider key).
  2. `docker compose up -d db`
  3. `pnpm install`
  4. `pnpm db:migrate`
  5. `pnpm tsx scripts/create-admin.ts` (one-time)
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
| M4 — Profiling | pending | Student auth, three assessment modules (aptitude/innate/interests), deterministic scoring, result screen, retake cooldown |
| M5 — Polish | pending | Institute filtering surfaced student-side, admin dashboard stats, sortable/searchable admin tables, bulk lifecycle actions, citations in Q&A, cluster filter chips |

---

## 12. Glossary

- **AI safety tag** — `ai_safe | ai_augmented | ai_risk`. Indicates how AI exposure is expected to evolve careers downstream of this course. Both the model and the admin can set it; we store the model's pick in `ai_safety_tag_ai` for audit and the human-confirmed value in `ai_safety_tag`.
- **Career cluster** — short text tag (e.g., `"healthcare-research"`) repeated across courses; used by `arrayOverlaps()` to match related courses and (M5) by the student catalogue's filter chips.
- **Stream** — `science | commerce | arts | vocational`. One per course (a course is taxonomically primary in one stream).
- **`qa_sid`** — anonymous HttpOnly cookie that scopes the Q&A message budget (`capacity: 20, refillPerSecond: 0`). Reloading sets a new sid.
- **Source URLs** — URLs the AI cited (or an admin pasted) supporting the course's claims. Bounded to ≤8 per course, verified at write time.
- **Verified / broken / unknown / unchecked** — UI states from `lib/url-verify.ts`: HTTP 2xx-3xx, HTTP 4xx-5xx, network/timeout, never-checked respectively.
