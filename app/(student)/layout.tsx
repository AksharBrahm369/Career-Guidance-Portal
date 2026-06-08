import { headers } from "next/headers";
import { StudentHeader } from "@/components/student/student-shell/student-header";

// The (student) root applies the warm "student" theme (violet + emerald-teal)
// scoped via `.theme-student`. Auth routes (login / signup) render bare and
// centered — no app nav — detected via the x-pathname header set in middleware.
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAuthRoute =
    pathname.startsWith("/student/login") ||
    pathname.startsWith("/student/signup");

  if (isAuthRoute) {
    return (
      <div className="theme-student flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 font-sans">
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  return (
    <div className="theme-student min-h-dvh bg-background font-sans">
      <StudentHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
