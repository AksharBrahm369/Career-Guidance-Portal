import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { normalizePhone } from "@/lib/phone";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if ((session?.user as { role?: string } | undefined)?.role === "admin") redirect("/admin");

  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const phone = normalizePhone(String(formData.get("phone") ?? ""));
    const password = String(formData.get("password") ?? "");

    // Outcome is decided inside try/catch; the redirect() (which throws by
    // design) runs afterward so it isn't swallowed. We distinguish "not an
    // admin" from "bad credentials" only for our own logging — both surface the
    // same generic message to avoid account enumeration.
    let outcome: "ok" | "denied" = "denied";
    try {
      await auth.api.signInPhoneNumber({
        body: { phoneNumber: phone, password },
        headers: await headers(),
      });
      // Sign-in succeeded (password verified) — but a successful sign-in alone is
      // NOT authorization. Read the role authoritatively from the DB by phone.
      // (getSession() here would read the CURRENT request's cookies, which don't
      // yet carry the session just issued in this action's response — it would
      // always come back null and deny every admin.)
      const row = await db.query.user.findFirst({
        where: eq(user.phoneNumber, phone),
        columns: { role: true },
      });
      outcome = row?.role === "admin" ? "ok" : "denied";
    } catch (err) {
      // Could be invalid credentials, rate-limit, or an unexpected failure.
      // Log server-side for debugging; show the user a single generic message.
      console.error("[admin/login] sign-in failed:", err);
      outcome = "denied";
    }

    if (outcome !== "ok") redirect("/admin/login?error=1");
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center gap-4">
      <h1 className="text-2xl font-semibold">Admin sign in</h1>
      <p className="text-sm text-muted-foreground">
        Accounts are seeded via <code>pnpm create-admin</code>. No self-registration.
      </p>
      <form action={login} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        {error ? (
          <p className="text-sm text-destructive">Invalid credentials. Please try again.</p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
