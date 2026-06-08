import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { AdminShell } from "@/components/admin/shell/admin-shell";

// Middleware optimistically gates /admin/* (except /admin/login) on a session
// cookie; this layout enforces the admin ROLE for every admin page EXCEPT its
// own login route (which it wraps — gating it here would loop it to itself).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();

  // The login page renders bare (no role gate, no admin chrome).
  if ((hdrs.get("x-pathname") ?? "").startsWith("/admin/login")) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
      </div>
    );
  }

  const session = await getCachedSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") redirect("/admin/login");

  return (
    <>
      <AdminShell email={session.user.email}>{children}</AdminShell>
      <Toaster />
    </>
  );
}
