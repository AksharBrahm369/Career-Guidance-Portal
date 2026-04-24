# Career Guidance Platform

A pan-India career guidance platform for students in grades 9–12. Two independent parts:

1. **Admin panel** — AI-assisted course/institute fetch, review queue, and published catalogue.
2. **Student profiling** — three algorithmic modules (aptitude, innate strengths, academic interests) producing a career cluster recommendation.

AI is used in exactly two places: admin fetch and per-course student Q&A.

## Status

**Milestone 1 (Foundation) — scaffolding only.** No business logic for fetch, review, publish, assessment, or Q&A. See `/root/.claude/plans/career-guidance-platform-twinkling-nygaard.md` for the full plan.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS (mobile-first) + shadcn baseline
- Postgres via Drizzle ORM (works on local / Neon / Supabase)
- Auth.js (NextAuth v5) with Drizzle adapter — admin credentials only; student flow TBD (M4)
- Anthropic SDK (server-side only)
- Docker with `output: "standalone"` — portable to any cloud

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
| `pnpm check` | typecheck + lint + drizzle check |
| `pnpm db:generate` | Generate migration from schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:check` | Verify schema/migrations not drifted |
| `pnpm create-admin` | Seed a new admin |

## What works in M1

- `/` renders a landing placeholder with links to the three sections.
- `/admin` → redirects unauthenticated users to `/admin/login` (middleware-guarded).
- Seed an admin via `pnpm create-admin`, sign in at `/admin/login`, land on `/admin` dashboard ("Coming soon — M2").
- All student route skeletons (`/assessment`, `/courses`, `/courses/[slug]`) render without errors.
- `POST /api/courses/[id]/qa` returns one SSE frame then closes — proves streaming plumbing.
- `docker compose up --build` boots the full stack; migrations apply via entrypoint.

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
