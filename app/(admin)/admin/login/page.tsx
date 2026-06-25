import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if ((session?.user as { role?: string } | undefined)?.role === "admin") redirect("/admin");

  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center gap-4">
      <h1 className="text-2xl font-semibold">Admin sign in</h1>
      <p className="text-sm text-muted-foreground">
        Accounts are seeded via <code>pnpm create-admin</code>. No self-registration.
      </p>
      <AdminLoginForm showInitialError={Boolean(error)} />
    </div>
  );
}
