import { auth } from "@/lib/auth";

// Middleware guards /admin/* (except /admin/login). This layout just renders chrome.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      {session?.user?.role === "admin" ? (
        <header className="border-b bg-muted/30">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">Admin Panel</span>
            <span className="text-xs text-muted-foreground">{session.user?.email}</span>
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}
