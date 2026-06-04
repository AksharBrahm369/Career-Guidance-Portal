# Profiling Engine — Plan 2a: Student Authentication

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a student create an account (name + email/phone + grade + password) and log in, with a student session distinct from admin, so the `/assessment` area can be gated. No assessment UI/scoring here — that's Plan 2b.

**Architecture:** Reuse the existing scrypt password util (`lib/auth/password.ts`) and the NextAuth JWT setup. Add `passwordHash` to the `students` table; add a **second Credentials provider** (`id: "student"`) to the full auth config that authorizes against `students`; carry `studentId` + `role:"student"` in the JWT/session callbacks (alongside the existing admin `adminId`/`role:"admin"`); add a `requireStudent()` server guard mirroring `requireAdmin()`; add student signup API + signup/login pages; gate `/assessment/*` in middleware.

**Tech Stack:** Next.js 15 (App Router) · NextAuth v5 (JWT, Credentials) · Drizzle + Postgres · Zod · `node:crypto` scrypt · Vitest (`lib/**/*.test.ts`).

**Spec:** [`docs/superpowers/specs/2026-06-03-profiling-engine-design.md`](../specs/2026-06-03-profiling-engine-design.md) §7 (identity) + §8.1 (student auth). Build decisions: email/phone + password (reuse scrypt); account required upfront.

**Done when:** a student can sign up and log in; `/assessment/*` redirects unauthenticated visitors to the student login; admin login is **unaffected**; `pnpm check` green; `pnpm build` compiles (Windows standalone-symlink EPERM is pre-existing/environmental).

---

## File Structure

- `db/schema/students.ts` (modify) — add `passwordHash`.
- `db/schema/enums.ts` — no change (userRole enum already has `admin`,`student`).
- `lib/auth/student-credentials.ts` (create) — Zod input schemas + `createStudent()` + `verifyStudentLogin()` (uses `lib/auth/password.ts`).
- `lib/auth/config.base.ts` (modify) — carry `studentId` in jwt/session callbacks.
- `lib/auth/config.ts` (modify) — give the existing admin Credentials provider `id:"admin"`; add a `id:"student"` Credentials provider.
- `lib/auth/require-student.ts` (create) — `requireStudent()` + `studentErrorResponse()` (mirror `require-admin.ts`).
- `app/api/student/signup/route.ts` (create) — POST signup.
- `app/(student)/student/signup/page.tsx` + `app/(student)/student/login/page.tsx` (create) — forms.
- `components/student/student-auth-form.tsx` (create) — shared client form (signup + login).
- `app/(admin)/admin/login/page.tsx` (modify) — update its `signIn(...)` call to the explicit `"admin"` provider id.
- `middleware.ts` (modify) — also guard `/assessment/*` → redirect to `/student/login`.
- Tests: `lib/__tests__/student-credentials.test.ts`.

---

## Task 1: Add `passwordHash` to `students`

**Files:** Modify `db/schema/students.ts`; generated migration.

- [ ] **Step 1: Add the column**

In `db/schema/students.ts`, add to the `students` table (after `name`):

```ts
    passwordHash: text("password_hash").notNull(),
```

(`text` is already imported in this file.)

- [ ] **Step 2: Generate, apply, verify**

Run: `pnpm db:generate && pnpm db:migrate && pnpm db:check`
Expected: `students.password_hash` added; no drift. (The `students` table is empty, so a NOT NULL add is safe.)

- [ ] **Step 3: Commit**

```bash
git add db/schema/students.ts drizzle/
git commit -m "feat(db): add password_hash to students"
```

---

## Task 2: Student credential helpers + input schemas (TDD on the schemas)

**Files:** Create `lib/auth/student-credentials.ts`; Test `lib/__tests__/student-credentials.test.ts`.

- [ ] **Step 1: Write the failing test (pure input validation)**

Create `lib/__tests__/student-credentials.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { StudentSignupInput, StudentLoginInput } from "@/lib/auth/student-credentials";

describe("StudentSignupInput", () => {
  it("accepts email signup", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", email: "a@b.com", grade: 11, password: "longenough12" }).success).toBe(true);
  });
  it("accepts phone signup", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", phone: "9876543210", grade: 12, password: "longenough12" }).success).toBe(true);
  });
  it("rejects when neither email nor phone given", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", grade: 11, password: "longenough12" }).success).toBe(false);
  });
  it("rejects a short password", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", email: "a@b.com", grade: 11, password: "short" }).success).toBe(false);
  });
  it("rejects out-of-range grade", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", email: "a@b.com", grade: 8, password: "longenough12" }).success).toBe(false);
  });
});

describe("StudentLoginInput", () => {
  it("requires identifier + password", () => {
    expect(StudentLoginInput.safeParse({ identifier: "a@b.com", password: "x" }).success).toBe(true);
    expect(StudentLoginInput.safeParse({ identifier: "", password: "x" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`pnpm test student-credentials`).

- [ ] **Step 3: Implement**

Create `lib/auth/student-credentials.ts`:

```ts
import "server-only";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { students, type Student } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

export const StudentSignupInput = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[0-9]{10}$/, "10-digit phone").optional(),
    grade: z.number().int().min(9).max(12),
    password: z.string().min(8).max(200),
  })
  .refine((d) => Boolean(d.email || d.phone), {
    message: "email or phone is required",
    path: ["email"],
  });
export type StudentSignupInput = z.infer<typeof StudentSignupInput>;

export const StudentLoginInput = z.object({
  identifier: z.string().min(1), // email or phone
  password: z.string().min(1),
});

export async function createStudent(input: StudentSignupInput): Promise<{ id: string }> {
  const passwordHash = await hashPassword(input.password);
  const [created] = await db
    .insert(students)
    .values({
      name: input.name,
      email: input.email?.toLowerCase() ?? null,
      phone: input.phone ?? null,
      grade: input.grade,
      passwordHash,
    })
    .returning({ id: students.id });
  if (!created) throw new Error("Failed to create student");
  return { id: created.id };
}

/** Look up by email OR phone, verify password. Returns the student or null. */
export async function verifyStudentLogin(identifier: string, password: string): Promise<Student | null> {
  const id = identifier.trim().toLowerCase();
  const student = await db.query.students.findFirst({
    where: or(eq(students.email, id), eq(students.phone, identifier.trim())),
  });
  if (!student) return null;
  const ok = await verifyPassword(student.passwordHash, password);
  return ok ? student : null;
}
```

- [ ] **Step 4: Run the test — expect PASS** (`pnpm test student-credentials`, 6 tests). (`server-only` is stubbed; `.env` is loaded by vitest, so the `lib/db` import is fine.)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/student-credentials.ts lib/__tests__/student-credentials.test.ts
git commit -m "feat(auth): student signup/login Zod schemas + createStudent/verifyStudentLogin"
```

---

## Task 3: Wire the student Credentials provider + studentId in the session

**Files:** Modify `lib/auth/config.base.ts` and `lib/auth/config.ts`.

- [ ] **Step 1: Carry `studentId` in callbacks**

In `lib/auth/config.base.ts`, update the `jwt` and `session` callbacks to also pass `studentId` (keep the existing `role`/`adminId` lines):

```ts
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "admin";
        token.adminId = (user as { adminId?: string }).adminId;
        token.studentId = (user as { studentId?: string }).studentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).adminId = token.adminId;
        (session.user as unknown as Record<string, unknown>).studentId = token.studentId;
      }
      return session;
    },
```

- [ ] **Step 2: Add the student provider + give admin an explicit id**

In `lib/auth/config.ts`: import the student helpers, give the EXISTING admin `Credentials({...})` an explicit `id: "admin"` (add it as the first property), and add a second provider. Add near the top:

```ts
import { StudentLoginInput, verifyStudentLogin } from "./student-credentials";
```

Add `id: "admin",` as the first field of the existing admin `Credentials({ ... })`. Then add this second provider to the `providers` array (after the admin one):

```ts
    Credentials({
      id: "student",
      name: "Student",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = StudentLoginInput.safeParse(raw);
        if (!parsed.success) return null;
        const student = await verifyStudentLogin(parsed.data.identifier, parsed.data.password);
        if (!student) return null;
        return {
          id: student.id,
          email: student.email ?? undefined,
          name: student.name,
          role: "student" as const,
          studentId: student.id,
        };
      },
    }),
```

- [ ] **Step 3: Update the admin login to use the explicit provider id**

Read `app/(admin)/admin/login/page.tsx`. Find its `signIn(...)` call (currently the default credentials provider) and change the provider id argument to `"admin"` (e.g., `signIn("admin", { ... })`). This is required because adding a second Credentials provider makes the default ambiguous. Verify the admin login form still posts the same `email`/`password` fields.

- [ ] **Step 4: Verify**

Run `pnpm typecheck && pnpm lint`. Expected clean. (If TS complains about `studentId`/`role` on the NextAuth `User`/`JWT` types, add a `types/next-auth.d.ts` module augmentation declaring `role?: string; adminId?: string; studentId?: string` on `User`, `Session["user"]`, and `JWT` — mirror any existing augmentation; if none exists, create one.)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/config.base.ts lib/auth/config.ts app/(admin)/admin/login/page.tsx types/
git commit -m "feat(auth): add student Credentials provider + studentId in session (admin id explicit)"
```

---

## Task 4: `requireStudent()` server guard

**Files:** Create `lib/auth/require-student.ts`.

- [ ] **Step 1: Implement (mirror `lib/auth/require-admin.ts`)**

Create `lib/auth/require-student.ts`:

```ts
import "server-only";
import { auth } from "@/lib/auth";

export interface StudentSession {
  studentId: string;
  name: string;
}

export class StudentUnauthorizedError extends Error {
  constructor() {
    super("Student authentication required");
    this.name = "StudentUnauthorizedError";
  }
}

export async function requireStudent(): Promise<StudentSession> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const studentId = (session?.user as { studentId?: string } | undefined)?.studentId;
  if (!session || role !== "student" || !studentId) throw new StudentUnauthorizedError();
  return { studentId, name: session.user!.name ?? "" };
}

export function studentErrorResponse(err: unknown): Response | null {
  if (err instanceof StudentUnauthorizedError) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
```

- [ ] **Step 2: Verify** `pnpm typecheck`. Expected clean.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/require-student.ts
git commit -m "feat(auth): add requireStudent server guard"
```

---

## Task 5: Student signup API

**Files:** Create `app/api/student/signup/route.ts`.

- [ ] **Step 1: Implement**

Create `app/api/student/signup/route.ts`:

```ts
import { z } from "zod";
import { StudentSignupInput, createStudent } from "@/lib/auth/student-credentials";
import { db } from "@/lib/db";
import { students } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let input;
  try {
    input = StudentSignupInput.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  // Reject duplicate email/phone up front for a clean message.
  const existing = await db.query.students.findFirst({
    where: or(
      input.email ? eq(students.email, input.email.toLowerCase()) : undefined,
      input.phone ? eq(students.phone, input.phone) : undefined,
    ),
  });
  if (existing) {
    return Response.json({ error: "already_registered" }, { status: 409 });
  }
  try {
    const { id } = await createStudent(input);
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: "signup_failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint`. Expected clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/student/signup/
git commit -m "feat(auth): student signup API"
```

---

## Task 6: Student signup + login pages

**Files:** Create `components/student/student-auth-form.tsx`, `app/(student)/student/signup/page.tsx`, `app/(student)/student/login/page.tsx`. Follow the existing mobile-first student styling (see `components/student/catalogue-filters.tsx`).

- [ ] **Step 1: Shared client auth form**

Create `components/student/student-auth-form.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StudentAuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // email or phone for login
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("11");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/student/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email: email || undefined, grade: Number(grade), password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error === "already_registered" ? "That email is already registered." : "Sign-up failed.");
          return;
        }
        const r = await signIn("student", { identifier: email, password, redirect: false });
        if (r?.error) { setError("Signed up, but auto-login failed — try logging in."); return; }
      } else {
        const r = await signIn("student", { identifier, password, redirect: false });
        if (r?.error) { setError("Invalid email/phone or password."); return; }
      }
      router.push("/assessment");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {mode === "signup" ? (
        <>
          <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
          </select>
        </>
      ) : (
        <input className={inputCls} placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
      )}
      <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
        {busy ? "…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Pages**

Create `app/(student)/student/signup/page.tsx`:

```tsx
import Link from "next/link";
import { StudentAuthForm } from "@/components/student/student-auth-form";

export default function StudentSignupPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <StudentAuthForm mode="signup" />
      <p className="text-sm text-muted-foreground">
        Already have one? <Link href="/student/login" className="underline">Log in</Link>
      </p>
    </div>
  );
}
```

Create `app/(student)/student/login/page.tsx`:

```tsx
import Link from "next/link";
import { StudentAuthForm } from "@/components/student/student-auth-form";

export default function StudentLoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      <StudentAuthForm mode="login" />
      <p className="text-sm text-muted-foreground">
        New here? <Link href="/student/signup" className="underline">Create an account</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify** `pnpm typecheck && pnpm lint`. (`next-auth/react`'s `signIn` is client-safe.) Expected clean.

- [ ] **Step 4: Commit**

```bash
git add components/student/student-auth-form.tsx "app/(student)/student"
git commit -m "feat(auth): student signup + login pages"
```

---

## Task 7: Gate `/assessment/*` in middleware

**Files:** Modify `middleware.ts`.

- [ ] **Step 1: Add the student gate**

In `middleware.ts`, the matcher currently covers `/admin` + `/admin/:path*`. Extend the matcher to also include `/assessment` + `/assessment/:path*`, and in the handler add: if the path is under `/assessment`, require `role === "student"` else redirect to `/student/login`. Keep the existing admin logic intact. Example handler additions (place before the admin block or alongside it):

```ts
  if (pathname === "/assessment" || pathname.startsWith("/assessment/")) {
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    if (!req.auth || role !== "student") {
      const url = req.nextUrl.clone();
      url.pathname = "/student/login";
      return NextResponse.redirect(url);
    }
  }
```

And update the matcher:

```ts
export const config = {
  matcher: ["/admin", "/admin/:path*", "/assessment", "/assessment/:path*"],
};
```

(Note: `/student/login` and `/student/signup` are NOT in the matcher, so they stay public.)

- [ ] **Step 2: Verify gate + full gate**

Run `pnpm check` (must be green) and `pnpm build` (must compile; the standalone-copy `EPERM: symlink` on Windows is the known pre-existing environmental issue — compilation succeeding is the pass condition).

- [ ] **Step 3: Manual smoke (best-effort, optional)**

`pnpm dev`; visit `/assessment` while logged out → should redirect to `/student/login`. Sign up at `/student/signup` → lands on `/assessment` (currently the "Coming soon" stub — Plan 2b builds the real flow). Log out / log in at `/student/login`.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): gate /assessment to authenticated students"
```

---

## Self-Review

**Spec coverage (§7 identity, §8.1 student auth):**
- Account required upfront (name + email/phone + grade + password) → Tasks 1,2,5,6. ✓
- Student session distinct from admin (role routing) → Task 3. ✓
- `/assessment` gated → Task 7. ✓
- Admin auth unaffected (explicit `"admin"` provider id + login update) → Task 3. ✓
- Deferred (correctly): OTP/magic-link (build decision = password now); retake cooldown enforcement (Plan 2b/3); the assessment UI + scoring (Plan 2b).

**Placeholder scan:** Task 3 Step 3 (admin login `signIn` id update) and Task 7 (middleware edit) are described against existing files the implementer must read — wiring instructions, not missing definitions. The `next-auth.d.ts` augmentation is conditional (only if TS needs it); the implementer verifies via typecheck. All other steps have complete code.

**Type consistency:** `role`/`adminId`/`studentId` are set in the admin authorize (existing), the student authorize (Task 3), the jwt/session callbacks (Task 3), and read by `requireStudent` (Task 4) and middleware (Task 7) — consistent names throughout. `StudentSignupInput`/`StudentLoginInput`/`verifyStudentLogin`/`createStudent` (Task 2) are consumed by the signup API (Task 5) and the student provider (Task 3) with matching shapes.

**Risk note:** Adding a second Credentials provider is the main integration risk (admin login must switch to the explicit `"admin"` id). The implement→review loop + `pnpm check`/manual smoke cover it.

---

## Execution Handoff

Plan 2a complete. After this lands, **Plan 2b (assessment flow + scoring)** builds on the student session: assessments schema changes, the 4-module UI with save/resume + integrity, the scoring lib (lens scores), the submit APIs (replacing the 501 stub), and a starter item seed for the non-interest lenses.
