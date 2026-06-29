import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Compass,
  GraduationCap,
  LockKeyhole,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { assessments, courses } from "@/db/schema";
import { requireStudent, StudentUnauthorizedError } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { getAssessmentRecommendationView } from "@/lib/recommendation/assessment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const MODULES = ["interests", "work_style", "aptitude", "subjects", "marks"] as const;

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not completed";
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function StudentDashboardPage() {
  let studentId: string;
  let name: string;
  try {
    ({ studentId, name } = await requireStudent());
  } catch (err) {
    if (err instanceof StudentUnauthorizedError) redirect("/student/login");
    throw err;
  }

  const [latest, [catalogueCount]] = await Promise.all([
    db.query.assessments.findFirst({
      where: eq(assessments.studentId, studentId),
      orderBy: desc(assessments.startedAt),
    }),
    db.select({ value: count() }).from(courses).where(eq(courses.status, "published")),
  ]);

  const responses = (latest?.responses ?? {}) as Record<string, unknown>;
  const completedModules = MODULES.filter((module) => responses[module] != null).length;
  const recommendationView =
    latest?.status === "completed" ? await getAssessmentRecommendationView(latest) : null;
  const recommendations =
    recommendationView?.recommendedCourses.slice(0, 3) ?? [];
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Student dashboard"
        title={`Welcome, ${firstName}`}
        description="Keep your assessment, recommendations, and course exploration in one place."
        actions={
          <Button asChild>
            <Link href={latest?.status === "completed" ? "/courses" : "/assessment"}>
              {latest?.status === "completed" ? "Explore courses" : "Continue assessment"}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={ClipboardCheck}
          label="Assessment"
          value={
            latest?.status === "completed"
              ? "Completed"
              : latest
                ? `${completedModules} of ${MODULES.length} modules`
                : "Not started"
          }
          hint={
            latest?.status === "completed"
              ? `Completed ${formatDate(latest.completedAt)}`
              : "Build your Brain Profile"
          }
        />
        <StatusCard
          icon={BookOpen}
          label="Course catalogue"
          value={catalogueCount?.value ?? 0}
          hint="Published courses available"
        />
        
       
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Compass className="size-5 text-primary" aria-hidden />
              What to do next
            </CardTitle>
            <CardDescription>
              The next useful step based on your current profile status.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ActionTile
              href="/assessment"
              icon={Sparkles}
              title={latest ? "Review your profile" : "Start assessment"}
              description={
                latest?.status === "completed"
                  ? "See your Brain Profile and recommended directions."
                  : "Answer five short modules to unlock recommendations."
              }
              badge={latest?.status === "completed" ? "Ready" : latest ? "In progress" : "New"}
            />
            <ActionTile
              href="/courses"
              icon={BookOpen}
              title="Browse courses"
              description="Search streams, AI exposure, institutes, fees, and learning resources."
              badge={`${catalogueCount?.value ?? 0} live`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="size-5 text-primary" aria-hidden />
              Recommended learning
            </CardTitle>
            <CardDescription>
              {recommendations.length
                ? "Courses from your latest completed assessment."
                : latest?.status === "completed"
                  ? "No course matches yet. Browse the full catalogue while it grows."
                  : "Complete the assessment to unlock course matches."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations.length ? (
              <ol className="flex flex-col gap-3">
                {recommendations.map((course) => (
                  <li key={course.courseId}>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="group flex items-start justify-between gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {course.courseName}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {course.crossStream ? "Cross-stream option" : "Matches your stream"}
                        </span>
                      </span>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {course.fitScore}% fit
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <LockKeyhole className="size-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Recommendations are locked</p>
                  <p className="text-sm text-muted-foreground">
                    {latest?.status === "completed"
                      ? "We could not find a confident course match from the current catalogue yet."
                      : "Finish the assessment and this panel will show real course matches."}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={latest?.status === "completed" ? "/courses" : "/assessment"}>
                    {latest?.status === "completed" ? "Browse courses" : "Go to assessment"}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  hint,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  muted?: boolean;
}) {
  return (
    <Card className={muted ? "bg-muted/30" : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-muted-foreground">{label}</span>
          <span className="block truncate text-xl font-semibold tracking-tight">{value}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function ActionTile({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-3 rounded-lg border bg-background p-4 transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
        Open
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
