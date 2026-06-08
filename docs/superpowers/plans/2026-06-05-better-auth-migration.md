# Better Auth Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.
> **MANDATORY:** Better Auth is newer than the model's training cutoff. **Before writing any Better Auth code, install + read the official skill** (`npx skills add better-auth/skills`) and consult the live docs (better-auth.com). Do NOT hand-write Better Auth APIs from memory — confirm every API call (config options, plugin endpoints, CLI flags, `auth.api.*` signatures) against the skill/docs. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace NextAuth v5 entirely with Better Auth — one `user` table + roles, **phone + password for everyone** (admins and students), clean cutover (no data migration), preserving the existing guard signatures so downstream routes don't change.

**Architecture:** A single `lib/auth.ts` Better Auth instance (Drizzle adapter, email/password as the credential backend, `phoneNumber` + `admin` + `nextCookies` plugins) backs both roles. Phone is the real identifier; a synthesized unique email satisfies Better Auth's core. Guards (`requireAdmin`/`requireStudent`) are rewritten over `auth.api.getSession` but keep their return shapes (`{ adminId }` / `{ studentId, name }`), so the ~14 admin routes + assessment routes are untouched.

**Tech Stack:** Better Auth (latest) + `@better-auth/cli`, Drizzle 0.38 + pg, Next.js 15 App Router, Zod 3.25, Vitest. Spec: [`docs/superpowers/specs/2026-06-05-better-auth-migration-design.md`](../specs/2026-06-05-better-auth-migration-design.md).

**Done when:** `pnpm check` green; `pnpm build` compiles; an admin (created via `pnpm create-admin`) and a self-signed-up student can each log in by **phone + password** and reach `/admin` and `/assessment` respectively; role-gating holds; the assessment + recommendation flow still works (assessments keyed to `user.id`). NextAuth is fully removed.

---

## Pre-req (do first, once): install the Better Auth skill
```bash
npx skills add better-auth/skills --agent claude-code -y   # confirm exact flags via `npx skills --help`
```
Read the installed SKILL before Tasks 2–9. (Skill files are tooling — do not commit them, consistent with the repo's parked-skills convention.)

---

## Task 1: Dependencies + environment

**Files:** `package.json`, `lib/env.ts`, `.env.local`, `.env.example`.

- [ ] Install Better Auth, remove NextAuth: `pnpm remove next-auth @auth/drizzle-adapter && pnpm add better-auth && pnpm add -D @better-auth/cli`. (Confirm the Drizzle adapter import path with the skill — either built into `better-auth/adapters/drizzle` or the separate `@better-auth/drizzle-adapter` package; install the latter only if the skill says so.)
- [ ] `lib/env.ts`: replace `AUTH_SECRET` → `BETTER_AUTH_SECRET: z.string().min(32)` and `NEXTAUTH_URL` → `BETTER_AUTH_URL: z.string().url().default("http://localhost:3000")`. Keep everything else.
- [ ] `.env.local` and `.env.example`: rename `AUTH_SECRET`→`BETTER_AUTH_SECRET` (reuse the existing 43-char value), `NEXTAUTH_URL`→`BETTER_AUTH_URL`. (`.env.local` is the only env file — do not recreate `.env`.)
- [ ] Verify `pnpm exec tsx -e "import('@/lib/env').then(m=>console.log('env ok'))"` style load works (env validates). Commit: `chore(auth): swap next-auth deps for better-auth + env vars`.

---

## Task 2: Better Auth server instance + client

**INVOKE FIRST:** the `better-auth` skill. **Files:** `lib/auth.ts` (create), `lib/auth-client.ts` (create).

- [ ] `lib/auth.ts` — the instance (confirm exact option names against the skill):
```ts
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle"; // per skill; or "@better-auth/drizzle-adapter"
import { admin, phoneNumber } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import * as authSchema from "@/db/schema/auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      grade: { type: "number", required: false, input: false },
      cooldownOverride: { type: "boolean", required: false, input: false },
      lastAssessmentAt: { type: "date", required: false, input: false },
    },
  },
  plugins: [
    phoneNumber({ sendOTP: async () => {}, requireVerification: false }), // no SMS in v1
    admin({ defaultRole: "student", adminRoles: ["admin"] }),
    nextCookies(), // MUST be last
  ],
});
export type Session = typeof auth.$Infer.Session;
```
- [ ] `lib/auth-client.ts`:
```ts
import { createAuthClient } from "better-auth/react";
import { adminClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [phoneNumberClient(), adminClient()] });
export const { signIn, signUp, signOut, useSession } = authClient;
```
- [ ] `pnpm typecheck` (will fail until Task 3 creates `db/schema/auth`). Commit with Task 3.

---

## Task 3: Auth schema + migration (clean cutover)

**INVOKE FIRST:** the `better-auth` skill (CLI usage). **Files:** `db/schema/auth.ts` (replace), `db/schema/index.ts`, `db/schema/assessments.ts`, migration.

- [ ] Generate the Drizzle schema from the config: `npx @better-auth/cli generate --config lib/auth.ts --output db/schema/auth.ts` (confirm exact flags via the skill). This emits `user`, `session`, `account`, `verification` Drizzle tables including plugin columns (`role`, `banned`, `banReason`, `banExpires`, `phoneNumber`, `phoneNumberVerified`, our `grade`/`cooldownOverride`/`lastAssessmentAt`; session `impersonatedBy`). Review the output; ensure UUID ids match the repo convention if needed (Better Auth uses text ids by default — accept text ids; update FKs accordingly).
- [ ] `db/schema/index.ts`: it already `export * from "./auth"` — keep. Remove any now-dead exports.
- [ ] `db/schema/assessments.ts`: change `studentId` FK to reference `user.id` (Better Auth `user` table). If Better Auth ids are `text`, change `studentId` to `text(...).references(() => user.id)`. (0 rows, so type change is safe.)
- [ ] `pnpm db:generate`. The generated migration must: drop `admins`, `students`, old `users`/`accounts`/`sessions`/`verification_tokens`; create the Better Auth tables; alter `assessments.student_id` type+FK. If drizzle-kit can't sequence the drop/recreate cleanly, hand-author the SQL (the table set is empty — destructive drops are fine here). Then `pnpm db:migrate && pnpm db:check` (no drift).
- [ ] Commit Tasks 2+3: `feat(auth): better-auth instance, client, drizzle schema + cutover migration`.

---

## Task 4: Mount handler

**Files:** `app/api/auth/[...all]/route.ts` (create), `app/api/auth/[...nextauth]/route.ts` (delete).

- [ ] Create `app/api/auth/[...all]/route.ts`:
```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const runtime = "nodejs";
export const { GET, POST } = toNextJsHandler(auth);
```
- [ ] `git rm -r "app/api/auth/[...nextauth]"`. Commit: `feat(auth): mount better-auth route handler`.

---

## Task 5: Rewrite guards (preserve signatures)

**Files:** `lib/auth/require-admin.ts` (rewrite), `lib/auth/require-student.ts` (rewrite). Delete `lib/auth/{config,config.base,edge,index,password,student-credentials}.ts` (in Task 9).

- [ ] `lib/auth/require-student.ts` — same exports/shape as today (`StudentSession { studentId, name }`, `StudentUnauthorizedError`, `studentErrorResponse`):
```ts
import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export interface StudentSession { studentId: string; name: string; }
export class StudentUnauthorizedError extends Error { constructor(){ super("Student authentication required"); this.name = "StudentUnauthorizedError"; } }

export async function requireStudent(): Promise<StudentSession> {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "student") throw new StudentUnauthorizedError();
  return { studentId: session.user.id, name: session.user.name ?? "" };
}
export function studentErrorResponse(err: unknown): Response | null {
  if (err instanceof StudentUnauthorizedError) return Response.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
```
- [ ] `lib/auth/require-admin.ts` — mirror with `role !== "admin"`, returning `{ adminId: session.user.id, ... }` matching the current `AdminSession` shape (read the current file first and keep field names identical so the ~14 admin routes + `(admin)/layout.tsx` compile unchanged).
- [ ] `pnpm typecheck` for the guard files' consumers. Commit: `feat(auth): guards over better-auth getSession (signatures preserved)`.

---

## Task 6: Middleware

**Files:** `middleware.ts` (rewrite). Removes the edge/node Auth.js split.

- [ ] Replace with an optimistic cookie check (the authoritative role check stays in the guards, which run per route/page):
```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const hasSession = getSessionCookie(request);
  if (!hasSession) {
    const isAdmin = request.nextUrl.pathname.startsWith("/admin");
    return NextResponse.redirect(new URL(isAdmin ? "/admin/login" : "/student/login", request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/assessment/:path*"] };
```
(Confirm `getSessionCookie` import + that the public auth pages `/admin/login`, `/student/{login,signup}` are NOT in the matcher.) Commit: `feat(auth): better-auth cookie middleware`.

---

## Task 7: Student signup (phone + password)

**INVOKE FIRST:** `better-auth` + `vercel-react-best-practices` (the form is a client component). **Files:** `app/api/student/signup/route.ts` (rewrite or delete in favor of a server action), `components/student/student-auth-form.tsx` (rewrite), `app/(student)/student/signup/page.tsx`, `app/(student)/student/login/page.tsx`.

- [ ] Signup logic (server side; confirm the exact creation API with the skill — likely `auth.api.signUpEmail` with a synthesized email then set phoneNumber, or admin/createUser-style): given `{ name, phone, password }`, normalize phone, create a user with `email = \`${normalizedPhone}@phone.local\``, `password`, `name`, role defaulting to `student`, and set `phoneNumber = normalizedPhone`. Return `{ ok }` or the session.
- [ ] `student-auth-form.tsx`: replace the email/identifier inputs with a **phone** input + password (+ name on signup). On submit, signup mode → call the signup endpoint then `authClient.signIn.phoneNumber({ phoneNumber, password })`; login mode → `authClient.signIn.phoneNumber({ phoneNumber, password })`. On success `router.push("/assessment")`. Keep the existing Tailwind-token styling.
- [ ] `pnpm typecheck && pnpm lint`. Commit: `feat(auth): phone+password student signup/login`.

---

## Task 8: Admin login (phone + password)

**INVOKE FIRST:** `vercel-react-best-practices`. **Files:** `app/(admin)/admin/login/page.tsx` (rewrite).

- [ ] Replace the email server-action form with **phone + password**. Use a server action calling `auth.api.signInPhoneNumber({ body: { phoneNumber, password } })` (confirm signature via skill) with `redirectTo: "/admin"`, or a client form using `authClient.signIn.phoneNumber`. On `role !== "admin"` after sign-in, sign out + show "not an admin". Keep the "seeded via create-admin, no self-registration" copy. Commit: `feat(auth): phone+password admin login`.

---

## Task 9: create-admin script + remove dead code

**Files:** `scripts/create-admin.ts` (rewrite); delete `lib/auth/{config,config.base,edge,index,password,student-credentials}.ts`, `lib/__tests__/password.test.ts`, `lib/__tests__/student-credentials.test.ts`.

- [ ] Rewrite `scripts/create-admin.ts` to prompt for **name + phone + password (min 12)**, then create a Better Auth user (synth email from phone) with `role: "admin"` and `phoneNumber` set — via `auth.api` (confirm: `admin.createUser` with `role:"admin"`, or `signUpEmail` + `auth.api.setRole`). Must load env via the established tsx invocation (preload `.env.local`).
- [ ] `git rm lib/auth/config.ts lib/auth/config.base.ts lib/auth/edge.ts lib/auth/index.ts lib/auth/password.ts lib/auth/student-credentials.ts lib/__tests__/password.test.ts lib/__tests__/student-credentials.test.ts`.
- [ ] Grep for any remaining `next-auth` / `@/lib/auth/password` / `student-credentials` / `signIn` (next-auth) imports and fix. Commit: `feat(auth): rewrite create-admin; remove NextAuth code + tests`.

---

## Task 10: Verify end-to-end

- [ ] `pnpm check` green (typecheck + lint + db:check + tests). `pnpm build` compiles (Windows standalone-symlink EPERM is environmental).
- [ ] `pnpm create-admin` → create an admin (note the phone+password). `pnpm dev`, then: log into `/admin/login` by phone+password → reach `/admin`; sign up a student at `/student/signup` by phone+password → reach `/assessment`; complete the 5-module assessment → recommendations render (assessments now keyed to `user.id`).
- [ ] Role-gating: a logged-in student hitting `/admin` is redirected; an admin hitting `/assessment` is handled per `requireStudent`.
- [ ] Update `docs/MODULES.md` / `KNOWLEDGE_BASE.md` auth section to describe Better Auth (replace the NextAuth description). Commit: `docs(auth): document better-auth model`.

---

## Self-Review

**Spec coverage:** unified user+role (Tasks 2–3) ✓ · phone+password everyone, no OTP (Tasks 2,7,8,9) ✓ · synth email (Tasks 7,9) ✓ · additionalFields for student data (Task 2,3) ✓ · clean cutover drop+recreate (Task 3) ✓ · `assessments.studentId → user.id` (Task 3) ✓ · guards preserved (Task 5) ✓ · middleware cookie check (Task 6) ✓ · full NextAuth removal + deps + env (Tasks 1,4,9) ✓ · create-admin (Task 9) ✓ · verification incl. assessment e2e (Task 10) ✓. **Deferred per spec:** real OTP/SMS, phone password-reset, OAuth, email login, impersonation UI, remote-DB data migration.

**Placeholder scan:** API-exact calls (CLI flags, `signUpEmail`/`signInPhoneNumber`/`admin.createUser` signatures, drizzle-adapter import path) are intentionally deferred to the **better-auth skill + live docs** rather than guessed, because the library postdates the model cutoff — every such step names the skill as the source of truth. Architecture, file paths, guard code, handler, middleware, and the migration strategy are concrete.

**Type consistency:** guard return shapes (`{studentId,name}`, `{adminId,...}`) preserved from the current files so all callers compile unchanged; `assessments.studentId` ↔ `user.id` (id type aligned in Task 3); `Session` type from `auth.$Infer.Session`.

**Risk notes:** (a) Better Auth default ids are `text`, not `uuid` — Task 3 must align `assessments.studentId`'s type. (b) The drizzle-adapter package/import path is the one genuine unknown — resolve via the skill first. (c) Phone+password user *creation* without OTP is the trickiest API path — confirm the exact `auth.api` call with the skill before Task 7/9.

---

## Execution Handoff

After this lands, auth is fully Better Auth. Follow-ups (deferred): real phone OTP + SMS provider, phone password-reset, optional OAuth.
