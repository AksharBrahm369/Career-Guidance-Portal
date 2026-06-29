# Learning  Platform

A pan-India Learning  platform for students in grades 9–12. Two independent parts:

1. **Admin panel** — AI-assisted course/institute fetch, review queue, and published catalogue.
2. **Student experience** — catalogue browse, per-course AI Q&A, and a five-module assessment (interests, work style, aptitude, subject liking, marks) producing a deterministic career-cluster + course recommendation.

AI is used in exactly two places: admin fetch and per-course student Q&A. The assessment/recommendation engine is deterministic — it never calls a model.

## Status

**Milestone 4 (profiling engine) feature-complete**, on top of M2 (admin core) and M3 (student catalogue + course detail + AI Q&A streaming). Auth has been migrated to **Better Auth** — phone+password for admins *and* students. The admin panel has grown an app shell redesign, student CRUD (ban/unban, delete, password + cooldown reset), question-bank management, and career-cluster management; course lifecycle transitions are enforced by a central matrix (`lib/admin/course-transitions.ts`, HTTP 409 on invalid moves).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS (mobile-first) + shadcn baseline
- Postgres via Drizzle ORM (works on local / Neon / Supabase)
- Better Auth with Drizzle adapter — phone+password for everyone (`phoneNumber` + `admin` plugins, DB sessions, DB-backed rate limiting); students self-sign-up, admins are seeded
- Vercel AI SDK 6 — pluggable across Anthropic Claude, Google Gemini, OpenAI GPT
- Docker with `output: "standalone"` — portable to any cloud

## AI providers

The platform ships with a pluggable AI provider registry (`lib/ai/providers.ts`).
Default is Anthropic Sonnet 4.6; switch via env without code changes.

| ID | Default model | Env key |
|---|---|---|
| `anthropic` | `claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| `google` | `gemini-2.5-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `openai` | `gpt-4o` | `OPENAI_API_KEY` |

Set `AI_PROVIDER` to choose the global default. Optional per-feature
overrides: `AI_FETCH_PROVIDER` (admin fetch) and `AI_QA_PROVIDER` (course Q&A).
Only the selected provider's API key is required at runtime.

## Local development

```bash
cp .env.example .env.local                                 # fill ANTHROPIC_API_KEY + BETTER_AUTH_SECRET
# BETTER_AUTH_SECRET (>= 32 chars): openssl rand -base64 32

docker compose up -d db                                    # start postgres
pnpm install
pnpm db:migrate                                            # apply migrations
pnpm create-admin                                          # seed first admin
pnpm dev                                                   # http://localhost:3000
```

### Supabase database

This app uses normal Postgres through `DATABASE_URL`, so Supabase works without
a separate SDK. In Supabase, open **Project Settings -> Database -> Connection
string**, copy the pooler connection string, and put it in `.env.local`:

```bash
cp .env.supabase.example .env.local
```

Use the Session Pooler or Transaction Pooler URL if your network has trouble
with direct IPv6 database access. Keep `?sslmode=require` on the URL. If your
password contains special characters such as `@`, `#`, `/`, or `:`, URL-encode
the password before pasting it.

After updating `.env.local`, initialize Supabase:

```bash
pnpm install
pnpm db:migrate
pnpm seed:clusters
pnpm seed:demo-catalogue
pnpm seed:question-bank
pnpm create-admin
pnpm dev
```

> Password hashing is Better Auth's built-in scrypt — no native binding,
> works on Windows / macOS / Linux / WSL with paths containing spaces.
> `pnpm create-admin` prompts for name / phone / password (login is
> phone+password; there is no public admin signup).

### Pulling latest

```bash
git pull
pnpm install      # picks up the new lockfile
pnpm db:migrate   # applies any new migrations to the configured DATABASE_URL
pnpm dev
```

## Full stack via Docker

```bash
cp .env.example .env
docker compose up --build                                  # db + app, migrations auto-run on entrypoint
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build (standalone output) |
| `pnpm start` | Run production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `next lint` |
| `pnpm check` | typecheck + lint + drizzle check + tests |
| `pnpm test` | Vitest unit tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm db:generate` | Generate migration from schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:check` | Verify schema/migrations not drifted |
| `pnpm create-admin` | Seed a new admin |

## What works in M2

- `/admin` dashboard shows live counts (published, pending, rejected, archived), career-cluster coverage, and last AI fetch timestamp.
- AI fetch is rate-limited per admin (token bucket: capacity 20, refilling 20/minute, in-memory; Redis swap-in deferred to multi-replica deploys). One query can return a *batch* of courses; each is persisted and audited individually.
- The AI's `aiSafetyReasoning` for each course is captured at fetch time, displayed in the review card, and editable before publish — admins always see the model's justification, not just its label.
- `/admin/fetch` runs an AI fetch against the configured provider, validates the JSON against a Zod schema, and saves to `pending_review`. Existing course names are passed to the prompt as an exclusion list; `>85%` near-duplicates raise a warning rather than an auto-reject.
- `/admin/review` lists pending courses with inline edit, Save & Publish, and Reject (with reason). Publish enforces required fields (`description ≥ 150 chars`, eligibility, tenure, clusters).
- `/admin/courses/new` is a manual course form (same review/publish flow, `source = manual`).
- `/admin/catalogue` is the unified courses index: status tabs (`Published / Pending review / Rejected / Archived`) with live counts, server-side pagination (20/page, `?page=N`), and per-status row actions — Archive, Open in review, Reopen for review (clears `rejection_reason`), Restore to published.
- `/admin/review` paginates pending courses (10/page).
- Source URLs are verified at AI-fetch time and on manual create: dead URLs (4xx/5xx) are dropped with a warning; transient `unknown` (timeouts) are kept. Admins can edit source URLs in the review card and click "Verify all" to re-check on demand.
- All admin actions write to `audit_log` (admin id, action, old/new values, IP, user-agent).
- All endpoints check session + admin role; non-admins get 401.

## What works in M3

- `/courses` lists published courses with text search, stream filter, AI-safety filter, and pagination (12/page). Cards show stream, tenure, AI-safety chip, lead cluster, and institute count.
- `/courses/[slug]` renders the full course: description, AI-exposure reasoning explained to the student, eligibility, entrance exams, fees, an institutes table with website links, source URLs, and related courses (matched by `arrayOverlaps` on `career_clusters`).
- `POST /api/courses/[id|slug]/qa` streams an answer from the configured AI provider. The system prompt is split so the course-context block carries `cacheControl: ephemeral` on Anthropic and is sent flat on Google/OpenAI (which cache automatically).
- Anonymous Q&A sessions: an `HttpOnly` `qa_sid` cookie scopes a 20-message budget per (course × session). Calls past the cap return 429 with `limit` in the body. Students reload to start a fresh session.
- Per-message length cap (600 chars) and history cap (10 turns) keep prompt size predictable.
- Off-topic deflection is enforced by the system instructions: the assistant refuses + offers two example on-topic questions instead.

## What works in M4

- Student auth: phone+password signup at `/student/signup`, login at `/student/login` (Better Auth; brute-force protected via DB-backed rate limiting).
- `/assessment` is a resumable five-module wizard (interests, work style, aptitude, subject liking, marks). Answer keys never reach the client.
- Scoring is deterministic (`lib/assessment/scoring`): RIASEC interests, work-style traits, banded aptitude, subject affinities, marks profile, plus an overall confidence band.
- Recommendation is deterministic too (`lib/recommendation`): cluster match against admin-managed `career_clusters` target profiles, eligibility-gated course ranking over the published catalogue (top 10), and a low-signal flag so the result screen avoids a falsely-confident #1.
- Admins manage the inputs at `/admin/question-bank` and `/admin/clusters`, and students at `/admin/students` (ban/unban, delete, reset password, reset retake cooldown) — all audited.

## For Claude Code on the web

Configure a SessionStart hook in `.claude/settings.json` that runs
`pnpm install --frozen-lockfile && pnpm db:push` so web sessions begin with
deps installed and schema applied.

## Directory layout

```
app/                   # Next.js App Router
  (admin)/             # admin route group (role gate in layout; cookie gate in middleware)
  (student)/           # mobile-first student pages (catalogue, assessment, auth)
  api/                 # API routes (admin, assessment, courses Q&A, Better Auth handler)
components/            # UI
db/schema/             # Drizzle schema (one file per entity)
drizzle/               # generated migrations (committed)
lib/
  env.ts               # zod-validated env
  auth.ts              # Better Auth instance (phoneNumber + admin plugins)
  auth/                # getCachedSession + requireAdmin / requireStudent guards
  db/                  # drizzle client
  ai/                  # provider registry + safe-fetch + qa-prompt
  assessment/          # deterministic scoring (items, lenses, confidence)
  recommendation/      # deterministic cluster match + course ranking
docker/                # Dockerfile + entrypoint
scripts/               # migrate.ts, create-admin.ts, seeders
```

## Open decisions

- Retake cooldown enforcement (fields + admin reset exist; the automatic gate does not yet).
- Fees display — annual vs total course fees.
- Max institutes per course page.

## Roadmap

- **M2** — Admin: AI fetch, review queue, publish, audit log, manual course creation. ✅
- **M3** — Student catalogue, course detail, AI Q&A streaming (with prompt caching, rate limit, deflection rules). ✅
- **M4** — Student auth, profiling modules, deterministic scoring + recommendation, result screen. ✅ (cooldown enforcement pending)
- **M5** — Smart institute tagging, filtering, dashboard stats, polish.

admin email : sevak@hp.com
Admin name: HP Sevak
Password (min 12 chars): HPSevakDas@369


username : sevak@hp
pass : HPSevakDas@369


supabase details

username : Learning  Portal
pass : Career-guidance-portal