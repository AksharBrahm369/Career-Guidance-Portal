import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "admin") redirect("/admin");

  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    await signIn("admin", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center gap-4">
      <h1 className="text-2xl font-semibold">Admin sign in</h1>
      <p className="text-sm text-muted-foreground">
        Accounts are seeded via <code>pnpm create-admin</code>. No self-registration.
      </p>
      <form action={login} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
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
