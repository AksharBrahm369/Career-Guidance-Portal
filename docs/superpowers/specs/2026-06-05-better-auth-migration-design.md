# Auth Migration to Better Auth — Design Spec

**Status:** Approved design (brainstorming output) · **Date:** 2026-06-05 · **Branch:** `claude/career-guidance-platform-DVGCu`

## Context / goal

The app currently uses **NextAuth v5 (Auth.js)** with a hand-rolled split-identity model: separate `admins` and `students` Drizzle tables, two `Credentials` providers, scrypt password hashing (`lib/auth/password.ts`), edge/node split config, and the unused Auth.js adapter tables (`users`/`accounts`/`sessions`/`verificationTokens`). Auth.js has announced it is folding into **Better Auth**, and a `CredentialsSignin` debugging episode exposed how much bespoke wiring this model carries. 

**Goal:** replace the entire auth system with **Better Auth**, modelled idiomatically (one `user` table + roles), so auth "just works" and follows the library's conventions. Grounded in current Better Auth docs (fetched 2026-06-05): installation, Drizzle adapter, Next.js integration, admin plugin, phoneNumber plugin.

**Decisions locked with the user:**
- **Unified `user` + role** (admin plugin), not split tables.
- **Phone + password for everyone** (admins and students) — no email login.
- **Clean cutover** — local DB has 1 admin / 0 students / 0 assessments, so drop the old auth tables and recreate; no data-migration code.
- **Full replacement** of NextAuth in one cutover on this branch.
- Use the **official `better-auth/skills`** agent skill during implementation.

## Architecture

### Server instance — `lib/auth.ts`
```ts
betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true },          // underlying credential mechanism
  user: { additionalFields: { grade, cooldownOverride, lastAssessmentAt } },
  plugins: [
    phoneNumber({ sendOTP: <no-op stub>, requireVerification: false }),
    admin({ defaultRole: "student", adminRoles: ["admin"] }),
    nextCookies(),                               // must be last
  ],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
})
```
- **Phone + password, no OTP/SMS in v1:** Better Auth core sign-up is email/password, so every user gets a **synthesized unique email** (`<normalizedPhone>@phone.local`); the real identifier is `phoneNumber`. `signIn.phoneNumber({ phoneNumber, password })` is the login path (it relies on a `credential` account, which email/password signup creates). `requireVerification: false` + a no-op `sendOTP` means no SMS provider is needed; phone is treated as a trusted identifier for v1. (Real OTP verification + phone password-reset are a deferred follow-up.)
- **Roles:** admin plugin adds `role` to `user` (`student` default, `admin` for admins). `adminRoles: ["admin"]`.

### Client — `lib/auth-client.ts`
`createAuthClient({ plugins: [phoneNumberClient(), adminClient()] })`, exporting `signIn`, `signUp`, `signOut`, `useSession`, etc.

### Handler — `app/api/auth/[...all]/route.ts`
`export const { GET, POST } = toNextJsHandler(auth)`. Replaces `app/api/auth/[...nextauth]`.

### Data model
Better Auth CLI (`npx @better-auth/cli generate`, pointed at `lib/auth.ts`) emits the Drizzle schema for **`user` / `session` / `account` / `verification`** into `db/schema/auth.ts` (replacing the NextAuth tables), including plugin fields:
- `user`: `role`, `banned`, `banReason`, `banExpires` (admin); `phoneNumber`, `phoneNumberVerified` (phone); `grade`, `cooldownOverride`, `lastAssessmentAt` (our additionalFields).
- `session`: `impersonatedBy` (admin).

Dropped tables: `admins`, `students`, and the old `users`/`accounts`/`sessions`/`verification_tokens`.
`assessments.studentId` → FK re-points to **`user.id`** (a student is a `user` with `role = "student"`). Trivial (0 rows). The existing assessment/engine code keeps using `studentId` (now = the student's user id), so churn there is minimal.

### Guards — `lib/auth/require-student.ts`, `lib/auth/require-admin.ts`
Rewritten to:
```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session || session.user.role !== "student") throw new StudentUnauthorizedError();
return { studentId: session.user.id, name: session.user.name };
```
`requireAdmin` mirrors with `role === "admin"`. `studentErrorResponse`/`adminErrorResponse` (401 mapping) stay.

### Middleware — `middleware.ts`
Optimistic cookie check via `getSessionCookie(request)` to redirect unauthenticated users away from `/admin` and `/assessment`; the authoritative role check stays in the guards (run in each route/page). Removes the edge/node Auth.js split (`lib/auth/edge.ts`).

## Auth flows
- **Student signup** (`/student/signup` + server action / API): phone + name + password → `auth.api.signUpEmail({ email: synth(phone), password, name })`, then set `phoneNumber` (role defaults to `student`). Then `signIn.phoneNumber`.
- **Login** (`/admin/login`, `/student/login`): phone + password → `authClient.signIn.phoneNumber` (or `auth.api.signInPhoneNumber` in a server action). On success redirect to `/admin` or `/assessment` per role.
- **Admin creation** (`pnpm create-admin`): rewritten to create a phone+password user (synth email) and set `role: "admin"` (via `auth.api` admin/createUser or signUp + setRole).

## Removed
`next-auth`, `@auth/drizzle-adapter` (package.json); `lib/auth/{config,config.base,edge,password,student-credentials}.ts`; `app/api/auth/[...nextauth]`; the scrypt `password.ts` (Better Auth hashes internally, scrypt by default). Env: replace `AUTH_SECRET`/`NEXTAUTH_URL` with `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` in `lib/env.ts`, `.env.local`, `.env.example`.

## Cutover steps (high level — detailed in the plan)
1. Install `better-auth`, `@better-auth/drizzle-adapter`; remove `next-auth`, `@auth/drizzle-adapter`. Install `better-auth/skills`.
2. Write `lib/auth.ts` + `lib/auth-client.ts`; generate `db/schema/auth.ts` via the Better Auth CLI; add `student_*` additionalFields.
3. Drizzle migration: drop old auth tables, create Better Auth tables, retarget `assessments.studentId` → `user.id`. `pnpm db:migrate`.
4. Mount handler; rewrite guards, middleware, login/signup pages + signup API, `create-admin`.
5. Replace all `auth()` / NextAuth session reads with `auth.api.getSession`.
6. Update env; recreate the admin.

## Verification
- `pnpm check` green; `pnpm build` compiles.
- Recreate an admin + sign up a student via the new phone+password flows.
- Phone+password login into `/admin` (role admin) and `/assessment` (role student); confirm role-gating (a student can't reach `/admin`, etc.).
- The assessment flow + recommendation still work end-to-end (assessments now keyed to `user.id`).

## Out of scope / deferred
Real phone OTP verification + SMS provider; phone-based password reset; social/OAuth providers; email login; impersonation/ban admin UI (plugin supports it, not surfaced); migrating data from any remote/deployed DB (clean cutover assumes pre-launch local data only).
