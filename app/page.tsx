import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground self-start">
        Milestone 1 — Foundation
      </span>
      <h1 className="text-3xl font-semibold sm:text-4xl">Career Guidance Platform</h1>
      <p className="text-muted-foreground">
        A platform helping Indian students in grades 9–12 find suitable academic streams and career
        paths.
      </p>
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/assessment">
          Student assessment
        </Link>
        <Link className="underline" href="/courses">
          Course catalogue
        </Link>
        <Link className="underline" href="/admin/login">
          Admin panel
        </Link>
      </nav>
    </main>
  );
}
