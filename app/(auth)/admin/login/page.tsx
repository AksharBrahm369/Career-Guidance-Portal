import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { auth } from "@/lib/auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if ((session?.user as { role?: string } | undefined)?.role === "admin") redirect("/admin");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin sign in</h1>
      <p className="text-sm text-muted-foreground">
        Accounts are seeded via <code>pnpm create-admin</code>. No self-registration.
      </p>
      <AdminLoginForm showInitialError={Boolean(error)} />
    </main>
  );
}
