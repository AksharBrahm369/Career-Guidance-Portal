import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MODULES = [
  {
    title: "Course catalogue",
    description: "Browse streams, institutes, fees, AI exposure, and learning resources.",
    href: "/courses",
    icon: BookOpen,
    label: "Public",
  },
  {
    title: "Student assessment",
    description: "Students answer five modules and receive career/course recommendations.",
    href: "/assessment",
    icon: ClipboardCheck,
    label: "Student",
  },
  {
    title: "Admin workspace",
    description: "Manage students, question bank, career clusters, courses, and review queue.",
    href: "/admin/login",
    icon: LayoutDashboard,
    label: "Admin",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-background/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md font-heading text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="size-5" aria-hidden />
            </span>
            Learning  Portal
          </Link>
          <nav className="hidden items-center gap-2 sm:flex" aria-label="Home">
            <Button asChild variant="ghost" size="sm">
              <Link href="/courses">Courses</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/student/login">Student login</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/login">Admin</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <section className="flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">
              Education and NGO LMS
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-balance font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                Learn with clarity. Grow with confidence.
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                A college project platform for course discovery, student profiling, learning
                resources, and admin-reviewed catalogue management.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/courses">
                Explore courses
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/student/login">Student login</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <TrustItem icon={ShieldCheck} label="Admin reviewed" />
            <TrustItem icon={Users} label="Student friendly" />
          </div>
        </section>

        <section className="grid gap-3" aria-label="Platform modules">
          {MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <module.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-lg font-semibold">{module.title}</span>
                    <Badge variant="outline">{module.label}</Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {module.description}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function TrustItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
      <Icon className="size-4 text-primary" aria-hidden />
      {label}
    </div>
  );
}
