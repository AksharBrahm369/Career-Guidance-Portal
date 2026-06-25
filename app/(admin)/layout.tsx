import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { AdminShell } from "@/components/admin/shell/admin-shell";

// Middleware optimistically gates /admin/* on a session cookie; this layout
// enforces the admin ROLE for every real admin page. `/admin/login` lives in a
// separate route group, so client-side redirects cannot get caught in this gate.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
