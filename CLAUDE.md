# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **pan-India** career-guidance platform for grades 9–12, built as two independent products in one Next.js 15 (App Router) app: an **admin panel** (`app/(admin)`, `/admin/*`) that AI-fetches courses/institutes into a human review queue → published catalogue (full audit log), and a mobile-first **student experience** (`app/(student)`) — a course catalogue/detail browse plus a per-course streaming AI Q&A widget. Deterministic profiling (aptitude/innate/interests → career cluster) is scaffolded in the schema but its routes are stubbed (M4). AI runs in exactly **two** places — admin course fetch (`lib/ai/safe-fetch.ts`) and student Q&A (`app/api/courses/[id]/qa/route.ts`); profiling is deterministic and **must not** call a model.

> Scope is pan-India, not a single state — the `hp-career-box` / "HP Sevak" naming is legacy, not a constraint.

## Read this first — the deep reference lives in `docs/`

This file is the **operating contract**: the skill rules + command quick-reference below. For everything else, the source of truth is:

- **`docs/KNOWLEDGE_BASE.md`** — the *why*: vision, architecture + rationale, data model & status lifecycle, AI invariants, auth/RBAC, conventions, ops/deploy, milestone roadmap, glossary.
- **`docs/MODULES.md`** — the *what lives where*: bottom-up per-module reference (env → db → auth → AI → admin → student) + an "adding a feature" cheat sheet.

Read those before non-trivial work; treat the notes here as pointers into them, not a substitute.

## Golden rules — invoke the right skill BEFORE these steps

These skills live in `.claude/skills/` (tracked in `skills-lock.json`). Treat them as **mandatory, not optional**: invoke the skill via the Skill tool *before* writing or reviewing code in the matching area. The reason is specific — the model's built-in knowledge of these libraries is stale or version-wrong for this stack, so guessing silently ships broken patterns.

| Before you touch… | Invoke first | Why it's non-negotiable here |
|---|---|---|
| **Any Vercel AI SDK code** — `lib/ai/*` (`safe-fetch.ts`, `client.ts`, `providers.ts`, `qa-prompt.ts`), the Q&A route, the admin fetch route; anything using `streamText` / `generateText` / `Output.object` / tool calls / provider metadata (e.g. `cacheControl`) | **`ai-sdk`** | The app runs **AI SDK 6**, newer than the training cutoff. Recalled API shapes are likely wrong; the skill reads live docs from `node_modules/ai/docs/`. Guessing here breaks streaming + structured output. |
| **React / Next.js work** — anything in `app/**` or `components/**`, data fetching, RSC vs client boundaries, caching, bundle/perf, refactors | **`vercel-react-best-practices`** | React 19 + Next 15 App Router. Applies 70 prioritized perf rules and overrides Pages-Router-era defaults (waterfalls, needless client components, re-renders). |
| **Any auth code** — `lib/auth.ts`, `lib/auth-client.ts`, the guards (`lib/auth/require-{admin,student}.ts`), `middleware.ts`, login/signup pages, `app/api/auth/*`, `scripts/create-admin.ts`; anything using **Better Auth** (`auth.api.*`, `authClient.signIn.phoneNumber`, plugins, sessions/cookies) | **`better-auth-best-practices` + `better-auth-security-best-practices`** | The app runs **Better Auth** (phone+password for all, `admin` + `phoneNumber` plugins) — newer than the cutoff. Recalled APIs **and especially cookie/session/redirect timing** are wrong from memory. Auth bugs here (a `getSession()` that can't see the cookie set in the *same* server action; an `(admin)` layout that redirects its own login page) **compile clean and pass server-side smokes** — see the verification gate below. |
| **UI components** — adding/editing anything under `components/**`, `components.json`, the shadcn registry, Tailwind theming/variants | **`shadcn`** | Project is on the shadcn baseline. The skill themes/extends/composes components correctly and auto-injects project config — don't hand-write or copy components verbatim. ⚠️ It executes shell commands when invoked (probes `npx shadcn@latest info`). |
| **Neon-specific DB work** — branching, the serverless driver, connection pooling for deploys | **`neon-postgres`** | Neon's branch-per-PR + serverless-driver model has no equivalent in plain `pg`. (Routine Drizzle schema work follows the DB conventions in `docs/MODULES.md` §2–3.) |

Process skills still apply on top of these: **`superpowers:brainstorming`** before any new feature/behavior, **`superpowers:test-driven-development`** when writing tested logic, **`superpowers:systematic-debugging`** on any bug or test failure, and **`superpowers:requesting-code-review`** before merging. When a process skill and a stack skill both apply, run the process skill first (it decides *how* to approach), then the stack skill (it decides *what* to write).

### Verification gate — auth changes are not "done" until tested against a REAL request flow

Any change to **auth, sessions, cookies, redirects, middleware, or route-group layouts** MUST be verified with an **actual browser login OR an HTTP `sign-in → get-session` round-trip against the running dev server** (`pnpm dev` + `curl`/browser) — **not** just `pnpm check` or a server-side `auth.api.*` smoke. These bugs live in the request/cookie/redirect lifecycle: a layout that `redirect()`s its own login page, or a `getSession()` that can't see the cookie just issued in the same server action, **compile clean, pass `pnpm check`, and pass server-side `auth.api.*` calls** — they only fail in a real request. Treat the browser/HTTP flow as a blocking gate, not a caveat. (Hard-won, 2026-06.)

## Commands

```bash
pnpm dev            # dev server on :3000
pnpm build          # production build (output: "standalone")
pnpm check          # FULL GATE: typecheck + lint + db:check + test — run before calling work done
pnpm test <pat>     # single file (pnpm test slug → lib/__tests__/slug.test.ts); pnpm test -t "<name>" for one test
pnpm db:generate    # after editing db/schema/* → emits drizzle/00NN_*.sql (COMMIT it)
pnpm db:migrate     # apply migrations; pnpm db:check verifies no drift (part of the gate)
pnpm create-admin   # seed an admin row (required to log into /admin)
```

CI mirrors `pnpm check` + `pnpm build`. Tests run **only** from `lib/**/*.test.ts` — a test placed elsewhere silently won't run. Full local-setup / Docker / CI flow: `docs/KNOWLEDGE_BASE.md` §10.

## Conventions that bite (detail in `docs/`)

- **Drizzle `numeric` → TS `string`**, not number — mind the `String(...)` / `Number(...)` conversions (`tenureYears`, `feesMinInr`). · MODULES §2
- **`import "server-only"`** tops persistence/AI modules; never import them from client components. NOTE: `lib/auth.ts` deliberately has **no** `server-only` (the Better Auth CLI loads it in plain Node to generate the schema). · KB §9
- **Auth = Better Auth**, phone+password for everyone (no email login, no OTP in v1; a synthetic `<phone>@phone.local` email satisfies core). `lib/auth.ts` (instance) + `lib/auth-client.ts`; guards `lib/auth/require-{admin,student}.ts` over `auth.api.getSession` return `{adminId}`/`{studentId}` = `user.id`. `middleware.ts` does a cookie-existence gate + sets `x-pathname`; the **role** check lives in the guards + the `(admin)` layout (which exempts `/admin/login`). `normalizePhone()` in `lib/phone.ts` is the single source of truth for the phone identifier. `better-auth` is in `next.config.ts` `serverExternalPackages`. · MODULES §4
- **AI model IDs live in `lib/ai/providers.ts`** (`claude-sonnet-4-6` / `gemini-2.5-flash` / `gpt-4o`) and are the source of truth — the README's provider table is wrong. · MODULES §5
- **Status transitions are explicit** — guard `status === expectedFrom`, return **409** otherwise; call `logAudit()` *after* (never before) the write; never amend pushed commits. · KB §9, MODULES §8
