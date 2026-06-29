import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight">Admin sign in</h1>
            <p className="text-sm text-muted-foreground">
              Access course review, students, question bank, and reports.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Admin account</CardTitle>
            <CardDescription>
              Accounts are seeded via <code>pnpm create-admin</code>. No self-registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLoginForm showInitialError={Boolean(error)} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
