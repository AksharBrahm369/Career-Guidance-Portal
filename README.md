# Career Guidance Platform

A pan-India career guidance platform for students in grades 9–12. Two independent parts:

1. **Admin panel** — AI-assisted course/institute fetch, review queue, and published catalogue.
2. **Student profiling** — three algorithmic modules (aptitude, innate strengths, academic interests) producing a career cluster recommendation.

AI is used in exactly two places: admin fetch and per-course student Q&A.

## Status

**Milestone 3 (Student catalogue + course detail + AI Q&A streaming).** Live on top of M2: a mobile-first browse experience at `/courses` with search + stream/AI-safety filters + pagination; a full course detail page at `/courses/[slug]` with institutes, AI-exposure reasoning, sources, and related courses; a streaming AI Q&A widget per course (provider-pluggable, system prompt cached on Anthropic, deflection rules for off-topic questions, 20-message session cap via cookie).

See `/root/.claude/plans/career-guidance-platform-twinkling-nygaard.md` for the full plan.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS (mobile-first) + shadcn baseline
- Postgres via Drizzle ORM (works on local / Neon / Supabase)
- Auth.js (NextAuth v5) with Drizzle adapter — admin credentials only; student flow TBD (M4)
- Vercel AI SDK 6 — pluggable across Anthropic Claude, Google Gemini, OpenAI GPT
- Docker with `output: "standalone"` — portable to any cloud

## AI providers

The platform ships with a pluggable AI provider registry (`lib/ai/providers.ts`).
Default is Anthropic Sonnet 4.6; switch via env without code changes.

| ID | Default model | Env key |
|---|---|---|
| `anthropic` | `claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| `google` | `gemini-3.1-pro` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `openai` | `gpt-5.5` | `OPENAI_API_KEY` |

Set `AI_PROVIDER` to choose the global default. Optional per-feature
overrides: `AI_FETCH_PROVIDER` (admin fetch) and `AI_QA_PROVIDER` (course Q&A, M3).
Only the selected provider's API key is required at runtime.

## Local development

```bash
cp .env.example .env.local                                 # fill ANTHROPIC_API_KEY + AUTH_SECRET
# AUTH_SECRET: openssl rand -base64 32

docker compose up -d db                                    # start postgres
pnpm install
pnpm db:generate                                           # (only if schema changed)
pnpm db:migrate                                            # apply migrations
pnpm create-admin                                          # seed first admin
pnpm dev                                                   # http://localhost:3000
```

> Password hashing uses Node's built-in `crypto.scrypt` — no native binding,
> works on Windows / macOS / Linux / WSL with paths containing spaces. If you
> previously hit `Failed to load native binding` on `@node-rs/argon2`, just
> `pnpm install` after pulling and the issue is gone.

### Pulling latest

```bash
git pull
pnpm install      # picks up the new lockfile
pnpm db:migrate   # applies any new migrations
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
- AI fetch is rate-limited at 10 requests / minute per admin (in-memory token bucket; Redis swap-in deferred to multi-replica deploys).
- The AI's `aiSafetyReasoning` for each course is captured at fetch time, displayed in the review card, and editable before publish — admins always see the model's justification, not just its label.
- `/admin/fetch` runs an AI fetch against the configured provider, validates the JSON against a Zod schema, and saves to `pending_review`. Existing course names are passed to the prompt as an exclusion list; `>85%` near-duplicates raise a warning rather than an auto-reject.
- `/admin/review` lists pending courses with inline edit, Save & Publish, and Reject (with reason). Publish enforces required fields (`description ≥ 150 chars`, eligibility, tenure, clusters).
- `/admin/courses/new` is a manual course form (same review/publish flow, `source = manual`).
- `/admin/catalogue` is the unified courses index: status tabs (`Published / Pending review / Rejected / Archived`) with live counts, server-side pagination (20/page, `?page=N`), and per-status row actions — Archive, Open in review, Reopen for review (clears `rejection_reason`), Restore to published.
- `/admin/review` paginates pending courses (10/page).
- Source URLs are verified at AI-fetch time and on manual create: dead URLs (4xx/5xx) are dropped with a warning; transient `unknown` (timeouts) are kept. Admins can edit source URLs in the review card and click "Verify all" to re-check on demand.
- All admin actions write to `audit_log` (admin id, action, old/new values, IP, user-agent).
- All endpoints check session + admin role; non-admins get 401.

Student routes (`/assessment/*`) still show "Coming soon" — those land in M4.

## What works in M3

- `/courses` lists published courses with text search, stream filter, AI-safety filter, and pagination (12/page). Cards show stream, tenure, AI-safety chip, lead cluster, and institute count.
- `/courses/[slug]` renders the full course: description, AI-exposure reasoning explained to the student, eligibility, entrance exams, fees, an institutes table with website links, source URLs, and related courses (matched by `arrayOverlaps` on `career_clusters`).
- `POST /api/courses/[id|slug]/qa` streams an answer from the configured AI provider. The system prompt is split so the course-context block carries `cacheControl: ephemeral` on Anthropic and is sent flat on Google/OpenAI (which cache automatically).
- Anonymous Q&A sessions: an `HttpOnly` `qa_sid` cookie scopes a 20-message budget per (course × session). Calls past the cap return 429 with `limit` in the body. Students reload to start a fresh session.
- Per-message length cap (600 chars) and history cap (10 turns) keep prompt size predictable.
- Off-topic deflection is enforced by the system instructions: the assistant refuses + offers two example on-topic questions instead.

## For Claude Code on the web

Configure a SessionStart hook in `.claude/settings.json` that runs
`pnpm install --frozen-lockfile && pnpm db:push` so web sessions begin with
deps installed and schema applied.

## Directory layout

```
app/                   # Next.js App Router
  (admin)/             # admin route group (chrome only; middleware guards)
  (student)/           # mobile-first student pages
  api/                 # API routes (most return 501 in M1)
components/            # UI
db/schema/             # Drizzle schema (one file per entity)
drizzle/               # generated migrations (committed)
lib/
  env.ts               # zod-validated env
  auth/                # NextAuth v5 config (split edge/node)
  db/                  # drizzle client
  ai/                  # Anthropic client + safe-fetch stub (M2)
docker/                # Dockerfile + entrypoint
scripts/               # migrate.ts, create-admin.ts
```

## Open decisions (to confirm before M2)

- **Claude model ID** — spec references `claude-sonnet-4-20250514`. Current family is Claude 4.X (latest Sonnet: `claude-sonnet-4-6`, latest Opus: `claude-opus-4-7`). `lib/ai/client.ts` currently defaults to `claude-sonnet-4-6` as a placeholder.
- Retake cooldown period (profiling).
- Fees display — annual vs total course fees.
- Max institutes per course page.
- Algorithm weightings across 3 modules.

## Roadmap

- **M2** — Admin: AI fetch, review queue, publish, audit log, manual course creation.
- **M3** — Student catalogue, course detail, AI Q&A streaming (with prompt caching, rate limit, deflection rules).
- **M4** — Student auth, three profiling modules, algorithm, result screen.
- **M5** — Smart institute tagging, filtering, dashboard stats, polish.

admin email : sevak@hp.com
Admin name: HP Sevak
Password (min 12 chars): HPSevakDas@369